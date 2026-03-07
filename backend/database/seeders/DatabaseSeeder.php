<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Optionally seed a demo user for local testing
        \App\Models\User::factory()->create([
            'name'  => 'Demo User',
            'email' => 'demo@beyondchats.com',
        ]);
    }
}
