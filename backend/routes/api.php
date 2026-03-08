<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\EmailController;
use App\Http\Controllers\GmailController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public Routes (no auth required)
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login',    [AuthController::class, 'login']);
});

// Gmail OAuth callback - must be public (Google redirects here)
Route::get('/gmail/callback', [GmailController::class, 'handleCallback']);

/*
|--------------------------------------------------------------------------
| Protected Routes (require Sanctum token)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {

    // ── Auth ──────────────────────────────────────────────────────────────
    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me',     [AuthController::class, 'me']);
    });

    // ── Gmail Integration ─────────────────────────────────────────────────
    Route::prefix('gmail')->group(function () {
        Route::get('/auth-url',    [GmailController::class, 'getAuthUrlWithState']);
        Route::get('/status',      [GmailController::class, 'getStatus']);
        Route::post('/sync',       [GmailController::class, 'syncEmails']);
        Route::get('/sync-status', [GmailController::class, 'getSyncStatus']);
        Route::delete('/disconnect', [GmailController::class, 'disconnect']);
    });

    // ── Emails ────────────────────────────────────────────────────────────
    Route::prefix('emails')->group(function () {
        Route::get('/',                          [EmailController::class, 'getThreads']);
        Route::get('/analytics',                 [EmailController::class, 'getAnalytics']);
        Route::get('/attachment/{id}',           [EmailController::class, 'getAttachment']);
        Route::get('/{threadId}',                [EmailController::class, 'getThread']);
        Route::post('/{threadId}/reply',         [EmailController::class, 'reply']);
        Route::patch('/{threadId}/star',         [EmailController::class, 'toggleStar']);
        Route::patch('/{threadId}/read',         [EmailController::class, 'markRead']);
        Route::patch('/{threadId}/status',       [EmailController::class, 'updateStatus']);
    });
});
