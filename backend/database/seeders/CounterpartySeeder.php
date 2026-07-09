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
                'name' => 'ООО Поставщик Альфа',
                'inn' => '7701234567',
                'kpp' => '770101001',
                'bank_account' => '40702810400000000001',
                'bank_name' => 'ПАО Сбербанк',
                'bik' => '044525225',
                'type' => 'entity',
                'contact' => 'Смирнов А.П.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'ИП Смирнов А.В.',
                'inn' => '772345678901',
                'kpp' => null,
                'bank_account' => '40802810400000000002',
                'bank_name' => 'ПАО ВТБ',
                'bik' => '044525187',
                'type' => 'individual',
                'contact' => 'Смирнов А.В.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'АО ТехСервис',
                'inn' => '7803456789',
                'kpp' => '780301001',
                'bank_account' => '40702810400000000003',
                'bank_name' => 'ПАО Газпромбанк',
                'bik' => '044525823',
                'type' => 'entity',
                'contact' => 'Козлова Е.А.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'ООО РентаГрупп',
                'inn' => '7904567890',
                'kpp' => '790401001',
                'bank_account' => '40702810400000000004',
                'bank_name' => 'АО Альфа-Банк',
                'bik' => '044525593',
                'type' => 'entity',
                'contact' => 'Петров И.С.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'ПАО Энергоресурс',
                'inn' => '7705678901',
                'kpp' => '770501001',
                'bank_account' => '40702810400000000005',
                'bank_name' => 'ПАО Россельхозбанк',
                'bik' => '044525111',
                'type' => 'entity',
                'contact' => 'Васильев К.Д.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'ООО Альфа-Трейд',
                'inn' => '7706789012',
                'kpp' => '770601001',
                'bank_account' => '40702810400000000006',
                'bank_name' => 'ПАО Сбербанк',
                'bik' => '044525225',
                'type' => 'entity',
                'contact' => 'Николаев П.Р.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'ИП Коваленко Д.М.',
                'inn' => '771789012301',
                'kpp' => null,
                'bank_account' => '40802810400000000007',
                'bank_name' => 'АО Тинькофф Банк',
                'bik' => '044525974',
                'type' => 'individual',
                'contact' => 'Коваленко Д.М.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Самозанятый Орлов И.К.',
                'inn' => '772456789012',
                'kpp' => null,
                'bank_account' => '40802810400000000008',
                'bank_name' => 'ПАО Сбербанк',
                'bik' => '044525225',
                'type' => 'self_employed',
                'contact' => 'Орлов И.К.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
