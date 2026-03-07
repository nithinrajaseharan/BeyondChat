<?php

namespace App\Services;

use App\Models\Email;
use App\Models\EmailAttachment;
use App\Models\EmailThread;
use App\Models\GmailIntegration;
use Google\Client as GoogleClient;
use Google\Service\Gmail;
use Google\Service\Gmail\Message;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class GmailService
{
    private GoogleClient $client;

    public function __construct()
    {
        $this->client = new GoogleClient();
        $this->client->setClientId(config('services.google.client_id'));
        $this->client->setClientSecret(config('services.google.client_secret'));
        $this->client->setRedirectUri(config('services.google.redirect_uri'));
        $this->client->addScope(Gmail::GMAIL_READONLY);
        $this->client->addScope(Gmail::GMAIL_SEND);
        $this->client->addScope(Gmail::GMAIL_MODIFY);
        $this->client->addScope('https://www.googleapis.com/auth/userinfo.email');
        $this->client->addScope('https://www.googleapis.com/auth/userinfo.profile');
        $this->client->setAccessType('offline');
        $this->client->setPrompt('consent');
    }

    public function getAuthUrl(): string
    {
        return $this->client->createAuthUrl();
    }

    public function getAuthUrlWithState(string $state): string
    {
        $this->client->setState($state);
        return $this->client->createAuthUrl();
    }

    public function exchangeCode(string $code): array
    {
        $this->client->fetchAccessTokenWithAuthCode($code);
        $token = $this->client->getAccessToken();

        if (!$token || isset($token['error'])) {
            throw new \RuntimeException('Failed to exchange OAuth code: ' . ($token['error_description'] ?? 'unknown error'));
        }

        // Get authenticated user's Gmail address
        $oauth2 = new \Google\Service\Oauth2($this->client);
        $userInfo = $oauth2->userinfo->get();

        return [
            'token'         => $token,
            'gmail_address' => $userInfo->getEmail(),
        ];
    }

    /**
     * Configure the client with a stored integration's token, refreshing if needed.
     */
    public function configureClientForIntegration(GmailIntegration $integration): void
    {
        $tokenData = [
            'access_token'  => $integration->access_token,
            'refresh_token' => $integration->refresh_token,
            'expires_in'    => 3600,
        ];

        if ($integration->token_expiry) {
            $tokenData['expires_in'] = now()->diffInSeconds($integration->token_expiry, false);
        }

        $this->client->setAccessToken($tokenData);

        if ($this->client->isAccessTokenExpired()) {
            $newToken = $this->client->fetchAccessTokenWithRefreshToken($integration->refresh_token);

            if (isset($newToken['error'])) {
                throw new \RuntimeException('Failed to refresh access token: ' . $newToken['error_description']);
            }

            $integration->update([
                'access_token' => $newToken['access_token'],
                'token_expiry' => Carbon::now()->addSeconds($newToken['expires_in'] ?? 3600),
            ]);

            $this->client->setAccessToken($newToken);
        }
    }

    /**
     * Fetch and store emails for a user integration.
     *
     * @param GmailIntegration $integration
     * @param int              $days        Number of days back to fetch
     * @param callable|null    $onProgress  Callback($synced, $total) for progress updates
     */
    public function syncEmails(GmailIntegration $integration, int $days, ?callable $onProgress = null): void
    {
        $this->configureClientForIntegration($integration);

        $gmail    = new Gmail($this->client);
        $userId   = 'me';
        $after    = Carbon::now()->subDays($days)->timestamp;
        $query    = "after:{$after}";

        $threadIds  = [];
        $pageToken  = null;

        do {
            $params = ['q' => $query, 'maxResults' => 100];
            if ($pageToken) {
                $params['pageToken'] = $pageToken;
            }

            $response  = $gmail->users_threads->listUsersThreads($userId, $params);
            $threads   = $response->getThreads() ?? [];

            foreach ($threads as $t) {
                $threadIds[] = $t->getId();
            }

            $pageToken = $response->getNextPageToken();
        } while ($pageToken);

        $total = count($threadIds);
        $integration->update(['total_messages' => $total, 'synced_messages' => 0]);

        foreach ($threadIds as $index => $threadId) {
            try {
                $this->syncThread($gmail, $userId, $threadId, $integration->user_id);
            } catch (\Throwable $e) {
                Log::warning("Failed to sync thread {$threadId}: " . $e->getMessage());
            }

            $synced = $index + 1;
            $progress = (int) round(($synced / max($total, 1)) * 100);

            $integration->update([
                'synced_messages' => $synced,
                'sync_progress'   => $progress,
            ]);

            if ($onProgress) {
                ($onProgress)($synced, $total);
            }
        }
    }

    private function syncThread(Gmail $gmail, string $userId, string $threadId, int $appUserId): void
    {
        $threadData = $gmail->users_threads->get($userId, $threadId, ['format' => 'full']);
        $messages   = $threadData->getMessages() ?? [];

        if (empty($messages)) {
            return;
        }

        $participants = [];
        $subject      = '';
        $lastDate     = null;
        $hasAttachments = false;

        foreach ($messages as $msg) {
            $headers = $this->parseHeaders($msg->getPayload()->getHeaders());
            $from    = $this->parseEmailAddress($headers['from'] ?? '');

            $key = $from['email'] ?? '';
            if ($key && !isset($participants[$key])) {
                $participants[$key] = $from;
            }

            if (empty($subject)) {
                $subject = $headers['subject'] ?? '(No Subject)';
            }

            $dateStr = $headers['date'] ?? null;
            $date    = $dateStr ? Carbon::parse($dateStr) : Carbon::now();

            if (!$lastDate || $date->gt($lastDate)) {
                $lastDate = $date;
            }

            if ($this->messageHasAttachments($msg)) {
                $hasAttachments = true;
            }
        }

        // Determine category based on subject/content heuristics
        $category = $this->categorizeThread($subject, $messages);

        $thread = EmailThread::updateOrCreate(
            ['user_id' => $appUserId, 'gmail_thread_id' => $threadId],
            [
                'subject'         => $subject,
                'snippet'         => $threadData->getSnippet() ?? '',
                'last_message_at' => $lastDate,
                'message_count'   => count($messages),
                'has_attachments' => $hasAttachments,
                'participants'    => array_values($participants),
                'category'        => $category,
            ]
        );

        foreach ($messages as $msg) {
            $this->syncMessage($gmail, $userId, $msg, $thread, $appUserId);
        }
    }

    private function syncMessage(Gmail $gmail, string $userId, Message $msg, EmailThread $thread, int $appUserId): void
    {
        $msgId   = $msg->getId();
        $headers = $this->parseHeaders($msg->getPayload()->getHeaders());
        $dateStr = $headers['date'] ?? null;
        $date    = $dateStr ? Carbon::parse($dateStr) : Carbon::now();

        $from = $this->parseEmailAddress($headers['from'] ?? '');
        $to   = $this->parseAddressList($headers['to'] ?? '');
        $cc   = $this->parseAddressList($headers['cc'] ?? '');
        $bcc  = $this->parseAddressList($headers['bcc'] ?? '');

        [$bodyHtml, $bodyPlain] = $this->extractBody($msg->getPayload());

        $email = Email::updateOrCreate(
            ['user_id' => $appUserId, 'gmail_message_id' => $msgId],
            [
                'thread_id'       => $thread->id,
                'from_name'       => $from['name'] ?? '',
                'from_email'      => $from['email'] ?? '',
                'to_recipients'   => $to,
                'cc_recipients'   => $cc,
                'bcc_recipients'  => $bcc,
                'subject'         => $headers['subject'] ?? $thread->subject,
                'body_html'       => $bodyHtml,
                'body_plain'      => $bodyPlain,
                'date'            => $date,
                'is_read'         => !in_array('UNREAD', $msg->getLabelIds() ?? []),
                'labels'          => $msg->getLabelIds() ?? [],
            ]
        );

        $this->syncAttachments($gmail, $userId, $msg, $email);
    }

    private function syncAttachments(Gmail $gmail, string $userId, Message $msg, Email $email): void
    {
        $parts = $this->flattenParts($msg->getPayload());

        foreach ($parts as $part) {
            $body = $part->getBody();
            if (!$body || empty($part->getFilename())) {
                continue;
            }

            $attachmentId = $body->getAttachmentId();
            if (!$attachmentId) {
                continue;
            }

            // Skip if already stored
            if (EmailAttachment::where('email_id', $email->id)
                ->where('gmail_attachment_id', $attachmentId)->exists()) {
                continue;
            }

            try {
                $attachment = $gmail->users_messages_attachments->get($userId, $msg->getId(), $attachmentId);
                $data = $attachment->getData(); // base64url encoded

                EmailAttachment::create([
                    'email_id'             => $email->id,
                    'gmail_attachment_id'  => $attachmentId,
                    'filename'             => $part->getFilename(),
                    'mime_type'            => $part->getMimeType(),
                    'size'                 => $body->getSize() ?? 0,
                    'data'                 => $data,
                ]);
            } catch (\Throwable $e) {
                Log::warning("Failed to fetch attachment {$attachmentId}: " . $e->getMessage());
            }
        }
    }

    public function sendReply(GmailIntegration $integration, string $gmailThreadId, array $replyData): void
    {
        $this->configureClientForIntegration($integration);

        $gmail = new Gmail($this->client);

        $to      = $replyData['to'];
        $subject = $replyData['subject'];
        $body    = $replyData['body'];
        $inReplyTo = $replyData['in_reply_to'] ?? null;

        $rawMessage  = "To: {$to}\r\n";
        $rawMessage .= "Subject: {$subject}\r\n";
        $rawMessage .= "Content-Type: text/html; charset=UTF-8\r\n";
        if ($inReplyTo) {
            $rawMessage .= "In-Reply-To: {$inReplyTo}\r\n";
            $rawMessage .= "References: {$inReplyTo}\r\n";
        }
        $rawMessage .= "\r\n";
        $rawMessage .= $body;

        // Base64url encode
        $encoded = rtrim(strtr(base64_encode($rawMessage), '+/', '-_'), '=');

        $message = new \Google\Service\Gmail\Message();
        $message->setRaw($encoded);
        $message->setThreadId($gmailThreadId);

        $gmail->users_messages->send('me', $message);
    }

    private function parseHeaders(array $headers): array
    {
        $result = [];
        foreach ($headers as $header) {
            $result[strtolower($header->getName())] = $header->getValue();
        }
        return $result;
    }

    private function parseEmailAddress(string $raw): array
    {
        // Formats: "John Doe <john@example.com>" or "john@example.com"
        if (preg_match('/^(.+?)\s*<(.+?)>$/', trim($raw), $m)) {
            return ['name' => trim($m[1], '"'), 'email' => trim($m[2])];
        }
        return ['name' => '', 'email' => trim($raw)];
    }

    private function parseAddressList(string $raw): array
    {
        if (empty($raw)) return [];
        return array_map(fn($addr) => $this->parseEmailAddress(trim($addr)), explode(',', $raw));
    }

    private function extractBody($payload): array
    {
        $htmlBody  = null;
        $plainBody = null;

        $this->walkPayloadForBody($payload, $htmlBody, $plainBody);

        return [$htmlBody, $plainBody];
    }

    private function walkPayloadForBody($part, &$html, &$plain): void
    {
        $mimeType = $part->getMimeType() ?? '';
        $body     = $part->getBody();

        if ($mimeType === 'text/html' && $body && $body->getData()) {
            $html = base64_decode(strtr($body->getData(), '-_', '+/'));
            return;
        }

        if ($mimeType === 'text/plain' && $body && $body->getData()) {
            $plain = base64_decode(strtr($body->getData(), '-_', '+/'));
        }

        foreach ($part->getParts() ?? [] as $subPart) {
            $this->walkPayloadForBody($subPart, $html, $plain);
        }
    }

    private function flattenParts($payload): array
    {
        $parts = [];
        foreach ($payload->getParts() ?? [] as $part) {
            $parts[] = $part;
            foreach ($this->flattenParts($part) as $subPart) {
                $parts[] = $subPart;
            }
        }
        return $parts;
    }

    private function messageHasAttachments(Message $msg): bool
    {
        foreach ($this->flattenParts($msg->getPayload()) as $part) {
            if (!empty($part->getFilename()) && $part->getBody()?->getAttachmentId()) {
                return true;
            }
        }
        return false;
    }

    private function categorizeThread(string $subject, array $messages): string
    {
        $text = strtolower($subject);

        $urgentKeywords     = ['urgent', 'asap', 'immediately', 'action required', 'deadline', 'critical', 'important'];
        $promotionalKeywords = ['unsubscribe', 'offer', 'discount', 'sale', '% off', 'deal', 'promo', 'newsletter', 'marketing'];
        $socialKeywords      = ['invitation', 'connected', 'follow', 'liked', 'commented', 'friend request', 'mentioned you'];

        foreach ($urgentKeywords as $kw) {
            if (str_contains($text, $kw)) return 'urgent';
        }
        foreach ($promotionalKeywords as $kw) {
            if (str_contains($text, $kw)) return 'promotional';
        }
        foreach ($socialKeywords as $kw) {
            if (str_contains($text, $kw)) return 'social';
        }

        return 'general';
    }
}
