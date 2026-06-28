<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run()
    {
        User::create([
            'name' => 'Администратор',
            'email' => 'admin@example.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
        ]);

        User::create([
            'name' => 'Инициатор',
            'email' => 'initiator@example.com',
            'password' => Hash::make('password'),
            'role' => 'initiator',
        ]);

        User::create([
            'name' => 'Руководитель',
            'email' => 'manager@example.com',
            'password' => Hash::make('password'),
            'role' => 'manager',
        ]);

        User::create([
            'name' => 'Казначей',
            'email' => 'treasurer@example.com',
            'password' => Hash::make('password'),
            'role' => 'treasurer',
        ]);
    }
}
