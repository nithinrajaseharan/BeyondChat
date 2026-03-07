<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailAttachment extends Model
{
    protected $fillable = [
        'email_id',
        'gmail_attachment_id',
        'filename',
        'mime_type',
        'size',
        'data',
    ];

    protected $hidden = ['data'];

    public function email(): BelongsTo
    {
        return $this->belongsTo(Email::class);
    }

    /**
     * Return attachment metadata (without raw data).
     */
    public function toMetaArray(): array
    {
        return [
            'id'        => $this->id,
            'filename'  => $this->filename,
            'mime_type' => $this->mime_type,
            'size'      => $this->size,
        ];
    }
}
