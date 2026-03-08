<?php

namespace App\Http\Controllers;

use App\Models\Email;
use App\Models\EmailAttachment;
use App\Models\EmailThread;
use App\Services\GmailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class EmailController extends Controller
{
    public function __construct(private readonly GmailService $gmailService) {}

    public function getThreads(Request $request): JsonResponse
    {
        $user     = $request->user();
        $query    = EmailThread::where('user_id', $user->id)
            ->with('latestEmail')
            ->orderBy('last_message_at', 'desc');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('subject', 'like', "%{$search}%")
                  ->orWhere('snippet', 'like', "%{$search}%");
            });
        }

        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }

        if ($request->query('starred') === '1') {
            $query->where('is_starred', true);
        }

        $threads = $query->paginate(20);

        return response()->json([
            'data'       => $threads->map(fn($t) => $this->threadSummary($t)),
            'pagination' => [
                'current_page' => $threads->currentPage(),
                'last_page'    => $threads->lastPage(),
                'total'        => $threads->total(),
            ],
        ]);
    }

    public function getThread(Request $request, int $threadId): JsonResponse
    {
        $user   = $request->user();
        $thread = EmailThread::where('user_id', $user->id)
            ->where('id', $threadId)
            ->with(['emails.attachments'])
            ->firstOrFail();

        Email::where('thread_id', $thread->id)->update(['is_read' => true]);
        $thread->update(['is_read' => true]);

        return response()->json([
            'thread' => [
                'id'              => $thread->id,
                'gmail_thread_id' => $thread->gmail_thread_id,
                'subject'         => $thread->subject,
                'category'        => $thread->category,
                'status'          => $thread->status ?? 'open',
                'is_starred'      => $thread->is_starred,
                'participants'    => $thread->participants,
                'message_count'   => $thread->message_count,
                'has_attachments' => $thread->has_attachments,
                'last_message_at' => $thread->last_message_at?->toIso8601String(),
                'emails'          => $thread->emails->map(fn($e) => $this->emailResource($e)),
            ],
        ]);
    }

    public function reply(Request $request, int $threadId): JsonResponse
    {
        $user   = $request->user();
        $thread = EmailThread::where('user_id', $user->id)
            ->where('id', $threadId)
            ->with('emails')
            ->firstOrFail();

        $validated = $request->validate([
            'body'    => 'required|string|max:50000',
            'to'      => 'required|email',
            'subject' => 'sometimes|string|max:500',
        ]);

        $integration = $user->gmailIntegration;
        if (!$integration || !$integration->isConnected()) {
            return response()->json(['message' => 'Gmail is not connected.'], 422);
        }

        $lastEmail  = $thread->emails->last();
        $replySubject = $validated['subject'] ?? 'Re: ' . $thread->subject;

        $this->gmailService->sendReply($integration, $thread->gmail_thread_id, [
            'to'          => $validated['to'],
            'subject'     => $replySubject,
            'body'        => $validated['body'],
            'in_reply_to' => $lastEmail?->gmail_message_id,
        ]);

        return response()->json(['message' => 'Reply sent successfully.']);
    }

    public function getAttachment(Request $request, int $id): Response
    {
        $user       = $request->user();
        $attachment = EmailAttachment::whereHas('email', function ($q) use ($user) {
            $q->where('user_id', $user->id);
        })->findOrFail($id);

        $binary = base64_decode(strtr($attachment->data, '-_', '+/'));

        return response($binary, 200, [
            'Content-Type'        => $attachment->mime_type ?? 'application/octet-stream',
            'Content-Disposition' => 'attachment; filename="' . addslashes($attachment->filename) . '"',
            'Content-Length'      => strlen($binary),
        ]);
    }

    public function updateStatus(Request $request, int $threadId): JsonResponse
    {
        $validated = $request->validate(['status' => 'required|in:open,in_progress,resolved']);
        $thread = EmailThread::where('user_id', $request->user()->id)->findOrFail($threadId);
        $thread->update(['status' => $validated['status']]);
        return response()->json(['status' => $thread->status]);
    }

    public function toggleStar(Request $request, int $threadId): JsonResponse
    {
        $thread = EmailThread::where('user_id', $request->user()->id)
            ->findOrFail($threadId);

        $thread->update(['is_starred' => !$thread->is_starred]);

        return response()->json(['is_starred' => $thread->is_starred]);
    }

    public function markRead(Request $request, int $threadId): JsonResponse
    {
        $thread = EmailThread::where('user_id', $request->user()->id)
            ->findOrFail($threadId);

        $thread->update(['is_read' => true]);
        Email::where('thread_id', $thread->id)->update(['is_read' => true]);

        return response()->json(['message' => 'Marked as read.']);
    }

    public function getAnalytics(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $volume = Email::where('user_id', $userId)
            ->where('date', '>=', now()->subDays(30))
            ->selectRaw('DATE(date) as day, COUNT(*) as count')
            ->groupBy('day')
            ->orderBy('day')
            ->get()
            ->map(fn($r) => ['day' => $r->day, 'count' => $r->count]);

        $topSenders = Email::where('user_id', $userId)
            ->whereNotNull('from_email')
            ->selectRaw('from_email, from_name, COUNT(*) as count')
            ->groupBy('from_email', 'from_name')
            ->orderByDesc('count')
            ->limit(5)
            ->get()
            ->map(fn($r) => [
                'email' => $r->from_email,
                'name'  => $r->from_name ?: $r->from_email,
                'count' => $r->count,
            ]);

        // Category distribution
        $categories = EmailThread::where('user_id', $userId)
            ->selectRaw('category, COUNT(*) as count')
            ->groupBy('category')
            ->get()
            ->map(fn($r) => ['category' => $r->category, 'count' => $r->count]);

        // Totals
        $totalThreads  = EmailThread::where('user_id', $userId)->count();
        $unreadThreads = EmailThread::where('user_id', $userId)->where('is_read', false)->count();
        $withAttach    = EmailThread::where('user_id', $userId)->where('has_attachments', true)->count();

        return response()->json([
            'volume'        => $volume,
            'top_senders'   => $topSenders,
            'categories'    => $categories,
            'total_threads' => $totalThreads,
            'unread'        => $unreadThreads,
            'with_attach'   => $withAttach,
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────
    // Presenters
    // ──────────────────────────────────────────────────────────────────────

    private function threadSummary(EmailThread $thread): array
    {
        $latest = $thread->latestEmail;
        return [
            'id'              => $thread->id,
            'gmail_thread_id' => $thread->gmail_thread_id,
            'subject'         => $thread->subject,
            'snippet'         => $thread->snippet,
            'category'        => $thread->category,
            'status'          => $thread->status ?? 'open',
            'is_read'         => $thread->is_read,
            'is_starred'      => $thread->is_starred,
            'has_attachments' => $thread->has_attachments,
            'message_count'   => $thread->message_count,
            'participants'    => $thread->participants,
            'last_message_at' => $thread->last_message_at?->toIso8601String(),
            'from_name'       => $latest?->from_name,
            'from_email'      => $latest?->from_email,
        ];
    }

    private function emailResource(Email $email): array
    {
        return [
            'id'              => $email->id,
            'gmail_message_id'=> $email->gmail_message_id,
            'from_name'       => $email->from_name,
            'from_email'      => $email->from_email,
            'to_recipients'   => $email->to_recipients,
            'cc_recipients'   => $email->cc_recipients,
            'bcc_recipients'  => $email->bcc_recipients,
            'subject'         => $email->subject,
            'body_html'       => $email->body_html,
            'body_plain'      => $email->body_plain,
            'date'            => $email->date?->toIso8601String(),
            'is_read'         => $email->is_read,
            'attachments'     => $email->attachments->map(fn($a) => $a->toMetaArray()),
        ];
    }
}
