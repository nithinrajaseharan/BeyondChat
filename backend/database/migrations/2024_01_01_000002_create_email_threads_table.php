<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_threads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('gmail_thread_id')->index();
            $table->string('subject')->nullable();
            $table->text('snippet')->nullable();
            $table->timestamp('last_message_at')->nullable()->index();
            $table->unsignedSmallInteger('message_count')->default(1);
            $table->boolean('has_attachments')->default(false);
            $table->boolean('is_read')->default(false);
            $table->boolean('is_starred')->default(false);
            $table->string('category')->default('general'); // urgent|promotional|social|general
            $table->json('participants')->nullable(); // array of {name, email}
            $table->timestamps();

            $table->unique(['user_id', 'gmail_thread_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_threads');
    }
};
