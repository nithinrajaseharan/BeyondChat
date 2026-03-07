<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Crypt;

class GmailIntegration extends Model
{
    protected $fillable = [
        'user_id',
        'gmail_address',
        'access_token',
        'refresh_token',
        'token_expiry',
        'sync_days',
        'sync_status',
        'sync_progress',
        'total_messages',
        'synced_messages',
        'last_synced_at',
    ];

    protected $hidden = [
        'access_token',
        'refresh_token',
    ];

    protected function casts(): array
    {
        return [
            'token_expiry'   => 'datetime',
            'last_synced_at' => 'datetime',
            'sync_progress'  => 'integer',
            'total_messages' => 'integer',
            'synced_messages'=> 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Encrypt tokens on set
    public function setAccessTokenAttribute($value): void
    {
        $this->attributes['access_token'] = $value ? encrypt($value) : null;
    }

    public function getAccessTokenAttribute($value): ?string
    {
        return $value ? decrypt($value) : null;
    }

    public function setRefreshTokenAttribute($value): void
    {
        $this->attributes['refresh_token'] = $value ? encrypt($value) : null;
    }

    public function getRefreshTokenAttribute($value): ?string
    {
        return $value ? decrypt($value) : null;
    }

    public function isConnected(): bool
    {
        return !empty($this->gmail_address);
    }

    public function isSyncing(): bool
    {
        return $this->sync_status === 'syncing';
    }
}
