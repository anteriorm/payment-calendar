<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CounterpartySeeder extends Seeder
{
    public function run()
    {
        DB::table('counterparties')->insert([
            [
                'name' => 'ООО "Ромашка"',
                'inn' => '1234567890',
                'details' => 'БИК 044525225, счёт 40702810400000000001 в Сбере',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'ООО "Поставщик"',
                'inn' => '0987654321',
                'details' => 'БИК 044525222, счёт 40702810400000000002 в ВТБ',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Иванов Иван Иванович',
                'inn' => '123456789012',
                'details' => 'Паспорт 1234 567890',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
