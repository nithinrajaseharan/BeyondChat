<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('emails', function (Blueprint $table) {
            $table->id();
            $table->foreignId('thread_id')->constrained('email_threads')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('gmail_message_id')->index();
            $table->string('from_name')->nullable();
            $table->string('from_email')->nullable();
            $table->json('to_recipients')->nullable();   // [{name, email}, ...]
            $table->json('cc_recipients')->nullable();
            $table->json('bcc_recipients')->nullable();
            $table->string('subject')->nullable();
            $table->longText('body_html')->nullable();
            $table->longText('body_plain')->nullable();
            $table->timestamp('date')->nullable()->index();
            $table->boolean('is_read')->default(false);
            $table->json('labels')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'gmail_message_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('emails');
    }
};
