<?php

namespace App\Http\Controllers;

use App\Models\EmailThread;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\ClientException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiController extends Controller
{
    public function suggestReply(Request $request, int $threadId): JsonResponse
    {
        $apiKey = env('GROQ_API_KEY');
        if (!$apiKey) {
            return response()->json([
                'message' => 'AI features are not configured. Add GROQ_API_KEY to your server .env file.',
            ], 503);
        }

        $thread = EmailThread::with('emails')
            ->where('user_id', $request->user()->id)
            ->findOrFail($threadId);

        // Build a condensed conversation transcript from the email chain
        $conversation = $thread->emails->map(function ($email) {
            $from = $email->from_name
                ? "{$email->from_name} <{$email->from_email}>"
                : $email->from_email;

            $body = $email->body_html
                ? strip_tags($email->body_html)
                : ($email->body_plain ?? '');

            // Collapse whitespace and cap per-message length
            $body = mb_substr(preg_replace('/\s+/', ' ', trim($body)), 0, 800);

            return "From: {$from}\n{$body}";
        })->implode("\n\n---\n\n");

        $messages = [
            [
                'role'    => 'system',
                'content' => 'You are a professional email assistant. Read the email thread and write a helpful, concise, and professional reply on behalf of the recipient. Return only the reply body text — no subject line, no "Subject:" prefix, no extra commentary.',
            ],
            [
                'role'    => 'user',
                'content' => "Email thread:\n\n{$conversation}\n\nWrite a reply:",
            ],
        ];

        try {
            $client   = new Client(['timeout' => 25]);
            $response = $client->post('https://api.groq.com/openai/v1/chat/completions', [
                'headers' => [
                    'Authorization' => "Bearer {$apiKey}",
                    'Content-Type'  => 'application/json',
                ],
                'json' => [
                    'model'       => 'llama-3.3-70b-versatile',
                    'messages'    => $messages,
                    'max_tokens'  => 400,
                    'temperature' => 0.7,
                ],
            ]);

            $result     = json_decode($response->getBody()->getContents(), true);
            $suggestion = trim($result['choices'][0]['message']['content'] ?? '');

            return response()->json(['suggestion' => $suggestion]);
        } catch (ClientException $e) {
            $body = json_decode($e->getResponse()->getBody()->getContents(), true);
            $msg  = $body['error']['message'] ?? 'OpenAI request failed.';
            return response()->json(['message' => $msg], 502);
        } catch (\Exception $e) {
            return response()->json(['message' => 'AI service unavailable. Please try again.'], 502);
        }
    }
}
