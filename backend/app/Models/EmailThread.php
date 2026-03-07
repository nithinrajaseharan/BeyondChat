<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EmailThread extends Model
{
    protected $fillable = [
        'user_id',
        'gmail_thread_id',
        'subject',
        'snippet',
        'last_message_at',
        'message_count',
        'has_attachments',
        'is_read',
        'is_starred',
        'category',
        'participants',
    ];

    protected function casts(): array
    {
        return [
            'last_message_at' => 'datetime',
            'has_attachments' => 'boolean',
            'is_read'         => 'boolean',
            'is_starred'      => 'boolean',
            'participants'    => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function emails(): HasMany
    {
        return $this->hasMany(Email::class, 'thread_id')->orderBy('date', 'asc');
    }

    public function latestEmail()
    {
        return $this->hasOne(Email::class, 'thread_id')->latestOfMany('date');
    }
}
