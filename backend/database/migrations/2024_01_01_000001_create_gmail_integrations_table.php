<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gmail_integrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('gmail_address')->nullable();
            $table->text('access_token')->nullable();
            $table->text('refresh_token')->nullable();
            $table->timestamp('token_expiry')->nullable();
            $table->unsignedTinyInteger('sync_days')->default(7);
            $table->enum('sync_status', ['idle', 'pending', 'syncing', 'completed', 'failed'])->default('idle');
            $table->unsignedTinyInteger('sync_progress')->default(0); // 0-100
            $table->unsignedInteger('total_messages')->default(0);
            $table->unsignedInteger('synced_messages')->default(0);
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gmail_integrations');
    }
};
