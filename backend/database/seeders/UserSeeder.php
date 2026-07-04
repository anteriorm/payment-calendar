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
            'name' => 'Сидоров А.К.',
            'email' => 'a.sidorov@truemachine.ru',
            'password' => Hash::make('password'),
            'role' => 'admin',
        ]);

        User::create([
            'name' => 'Иванова М.С.',
            'email' => 'm.ivanova@truemachine.ru',
            'password' => Hash::make('password'),
            'role' => 'initiator',
        ]);

        User::create([
            'name' => 'Козлова Е.В.',
            'email' => 'e.kozlova@truemachine.ru',
            'password' => Hash::make('password'),
            'role' => 'manager',
        ]);

        User::create([
            'name' => 'Петров И.А.',
            'email' => 'i.petrov@truemachine.ru',
            'password' => Hash::make('password'),
            'role' => 'treasurer',
        ]);
    }
}
