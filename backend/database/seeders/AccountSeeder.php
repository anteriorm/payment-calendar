<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Account;

class AccountSeeder extends Seeder
{
    public function run()
    {
        if (Account::count() > 0) return;

        Account::create([
            'name' => 'Расчётный счёт №1',
            'type' => 'bank',
            'currency' => 'RUB',
            'initial_balance' => 50000000,
        ]);

        Account::create([
            'name' => 'Расчётный счёт №2',
            'type' => 'bank',
            'currency' => 'USD',
            'initial_balance' => 20000000,
        ]);

        Account::create([
            'name' => 'Касса',
            'type' => 'cash',
            'currency' => 'RUB',
            'initial_balance' => 5000000,
        ]);
    }
}
