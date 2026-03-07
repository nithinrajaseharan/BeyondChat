<?php

namespace App\Jobs;

use App\Models\GmailIntegration;
use App\Services\GmailService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SyncEmailsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 600; // 10 minutes max
    public int $tries   = 2;

    public function __construct(
        private readonly int $integrationId,
        private readonly int $days
    ) {}

    public function handle(GmailService $gmailService): void
    {
        $integration = GmailIntegration::find($this->integrationId);

        if (!$integration) {
            Log::warning("SyncEmailsJob: integration {$this->integrationId} not found.");
            return;
        }

        $integration->update([
            'sync_status'   => 'syncing',
            'sync_progress' => 0,
            'sync_days'     => $this->days,
        ]);

        try {
            $gmailService->syncEmails($integration, $this->days);

            $integration->update([
                'sync_status'    => 'completed',
                'sync_progress'  => 100,
                'last_synced_at' => now(),
            ]);

            Log::info("SyncEmailsJob: completed for integration {$this->integrationId}");
        } catch (\Throwable $e) {
            Log::error("SyncEmailsJob failed for integration {$this->integrationId}: " . $e->getMessage());

            $integration->update([
                'sync_status' => 'failed',
            ]);

            throw $e;
        }
    }

    public function failed(\Throwable $exception): void
    {
        $integration = GmailIntegration::find($this->integrationId);
        $integration?->update(['sync_status' => 'failed']);

        Log::error("SyncEmailsJob permanently failed: " . $exception->getMessage());
    }
}
