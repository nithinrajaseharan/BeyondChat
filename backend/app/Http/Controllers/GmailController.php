<?php

namespace App\Http\Controllers;

use App\Jobs\SyncEmailsJob;
use App\Models\GmailIntegration;
use App\Services\GmailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class GmailController extends Controller
{
    public function __construct(private readonly GmailService $gmailService) {}

    public function getAuthUrl(Request $request): JsonResponse
    {
        $url = $this->gmailService->getAuthUrl();
        return response()->json(['url' => $url]);
    }

    public function handleCallback(Request $request): RedirectResponse
    {
        $code  = $request->query('code');
        $error = $request->query('error');
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');

        if ($error || !$code) {
            return redirect("{$frontendUrl}/integrations?error=" . urlencode($error ?? 'access_denied'));
        }

        $state = $request->query('state');
        if (!$state) {
            return redirect("{$frontendUrl}/integrations?error=missing_state");
        }

        $tokenModel = \Laravel\Sanctum\PersonalAccessToken::findToken($state);
        if (!$tokenModel) {
            return redirect("{$frontendUrl}/integrations?error=invalid_state");
        }

        $user = $tokenModel->tokenable;
        if (!$user) {
            return redirect("{$frontendUrl}/integrations?error=user_not_found");
        }

        try {
            $result = $this->gmailService->exchangeCode($code);
            $token  = $result['token'];

            GmailIntegration::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'gmail_address' => $result['gmail_address'],
                    'access_token'  => $token['access_token'],
                    'refresh_token' => $token['refresh_token'] ?? null,
                    'token_expiry'  => Carbon::now()->addSeconds($token['expires_in'] ?? 3600),
                    'sync_status'   => 'idle',
                ]
            );

            return redirect("{$frontendUrl}/integrations?connected=true");
        } catch (\Throwable $e) {
            Log::error('Gmail OAuth callback failed: ' . $e->getMessage());
            return redirect("{$frontendUrl}/integrations?error=token_exchange_failed");
        }
    }

    public function getStatus(Request $request): JsonResponse
    {
        $integration = $request->user()->gmailIntegration;

        if (!$integration) {
            return response()->json(['connected' => false]);
        }

        return response()->json([
            'connected'       => true,
            'gmail_address'   => $integration->gmail_address,
            'sync_status'     => $integration->sync_status,
            'sync_progress'   => $integration->sync_progress,
            'last_synced_at'  => $integration->last_synced_at?->toIso8601String(),
            'sync_days'       => $integration->sync_days,
        ]);
    }

    public function syncEmails(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'days' => 'required|integer|min:1|max:90',
        ]);

        $integration = $request->user()->gmailIntegration;

        if (!$integration || !$integration->isConnected()) {
            return response()->json(['message' => 'Gmail is not connected.'], 422);
        }

        if ($integration->isSyncing()) {
            return response()->json(['message' => 'Sync already in progress.'], 409);
        }

        $integration->update([
            'sync_status'   => 'pending',
            'sync_progress' => 0,
            'sync_days'     => $validated['days'],
        ]);

        SyncEmailsJob::dispatch($integration->id, $validated['days'])
            ->onQueue('email-sync');

        return response()->json(['message' => 'Sync started.', 'days' => $validated['days']]);
    }

    public function getSyncStatus(Request $request): JsonResponse
    {
        $integration = $request->user()->gmailIntegration;

        if (!$integration) {
            return response()->json(['sync_status' => 'idle', 'sync_progress' => 0]);
        }

        return response()->json([
            'sync_status'     => $integration->sync_status,
            'sync_progress'   => $integration->sync_progress,
            'total_messages'  => $integration->total_messages,
            'synced_messages' => $integration->synced_messages,
            'last_synced_at'  => $integration->last_synced_at?->toIso8601String(),
        ]);
    }

    public function disconnect(Request $request): JsonResponse
    {
        $user        = $request->user();
        $integration = $user->gmailIntegration;

        if ($integration) {
            $user->emailThreads()->delete();
            $integration->delete();
        }

        return response()->json(['message' => 'Gmail account disconnected.']);
    }

    public function getAuthUrlWithState(Request $request): JsonResponse
    {
        $token = $request->bearerToken();
        $url   = $this->gmailService->getAuthUrlWithState($token);
        return response()->json(['url' => $url]);
    }
}
