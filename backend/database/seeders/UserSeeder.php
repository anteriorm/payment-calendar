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
            'name' => 'Сидоров Андрей К.',
            'email' => 'admin@truemachine.ru',
            'password' => Hash::make('password'),
            'role' => 'admin',
        ]);

        User::create([
            'name' => 'Иванова Мария С.',
            'email' => 'initiator@truemachine.ru',
            'password' => Hash::make('password'),
            'role' => 'initiator',
        ]);

        User::create([
            'name' => 'Козлова Елена В.',
            'email' => 'treasurer@truemachine.ru',
            'password' => Hash::make('password'),
            'role' => 'treasurer',
        ]);

        User::create([
            'name' => 'Петров Иван А.',
            'email' => 'manager@truemachine.ru',
            'password' => Hash::make('password'),
            'role' => 'manager',
        ]);
    }
}
