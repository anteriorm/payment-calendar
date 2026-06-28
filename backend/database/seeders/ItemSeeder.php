<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Item;

class ItemSeeder extends Seeder
{
    public function run()
    {
        // Поступления
        Item::create(['name' => 'Оплата от клиентов', 'type' => 'income']);
        Item::create(['name' => 'Возврат займа', 'type' => 'income']);
        Item::create(['name' => 'Прочие поступления', 'type' => 'income']);

        // Списания
        Item::create(['name' => 'Аренда', 'type' => 'payment']);
        Item::create(['name' => 'Зарплата', 'type' => 'payment']);
        Item::create(['name' => 'Налоги', 'type' => 'payment']);
        Item::create(['name' => 'Закупка материалов', 'type' => 'payment']);
        Item::create(['name' => 'Командировки', 'type' => 'payment']);
    }
}
