<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Item;

class ItemSeeder extends Seeder
{
    public function run()
    {
        if (Item::count() > 0) return;

        // Поступления
        Item::create(['code' => '02.01', 'name' => 'Выручка от клиентов', 'type' => 'income', 'group' => 'Основная деятельность']);
        Item::create(['code' => '02.02', 'name' => 'Прочие доходы',       'type' => 'income', 'group' => 'Прочие']);

        // Списания
        Item::create(['code' => '01.01', 'name' => 'Аренда офиса',       'type' => 'payment', 'group' => 'Административные']);
        Item::create(['code' => '01.02', 'name' => 'Заработная плата',   'type' => 'payment', 'group' => 'Оплата труда']);
        Item::create(['code' => '01.03', 'name' => 'Расходные материалы','type' => 'payment', 'group' => 'Административные']);
        Item::create(['code' => '01.04', 'name' => 'Услуги подрядчиков', 'type' => 'payment', 'group' => 'Операционные']);
        Item::create(['code' => '01.05', 'name' => 'Налоги и сборы',     'type' => 'payment', 'group' => 'Налоги']);
    }
}
