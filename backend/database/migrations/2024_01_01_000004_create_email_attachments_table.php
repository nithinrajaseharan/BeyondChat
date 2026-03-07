<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('email_id')->constrained()->cascadeOnDelete();
            $table->string('gmail_attachment_id')->nullable();
            $table->string('filename');
            $table->string('mime_type')->nullable();
            $table->unsignedInteger('size')->default(0); // bytes
            $table->longText('data')->nullable();        // base64-encoded content
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_attachments');
    }
};
