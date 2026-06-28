<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Account;

class AccountSeeder extends Seeder
{
    public function run()
    {
        Account::create([
            'name' => 'Расчётный счёт Сбер',
            'type' => 'bank',
            'currency' => 'RUB',
            'initial_balance' => 50000000, // 500 000 руб
        ]);

        Account::create([
            'name' => 'Расчётный счёт ВТБ',
            'type' => 'bank',
            'currency' => 'RUB',
            'initial_balance' => 20000000, // 200 000 руб
        ]);

        Account::create([
            'name' => 'Касса',
            'type' => 'cash',
            'currency' => 'RUB',
            'initial_balance' => 5000000, // 50 000 руб
        ]);
    }
}
