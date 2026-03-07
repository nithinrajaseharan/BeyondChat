<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Email extends Model
{
    protected $fillable = [
        'thread_id',
        'user_id',
        'gmail_message_id',
        'from_name',
        'from_email',
        'to_recipients',
        'cc_recipients',
        'bcc_recipients',
        'subject',
        'body_html',
        'body_plain',
        'date',
        'is_read',
        'labels',
    ];

    protected function casts(): array
    {
        return [
            'date'           => 'datetime',
            'is_read'        => 'boolean',
            'to_recipients'  => 'array',
            'cc_recipients'  => 'array',
            'bcc_recipients' => 'array',
            'labels'         => 'array',
        ];
    }

    public function thread(): BelongsTo
    {
        return $this->belongsTo(EmailThread::class, 'thread_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(EmailAttachment::class);
    }
}
