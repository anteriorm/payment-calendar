<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Payment;
use App\Models\Account;
use App\Models\Counterparty;
use App\Models\Item;
use App\Models\User;
use Carbon\Carbon;

class PaymentSeeder extends Seeder
{
    public function run()
    {
        $accounts = Account::all();
        $counterparties = Counterparty::all();
        $paymentItems = Item::where('type', 'payment')->get();
        $user = User::first();

        if ($accounts->isEmpty() || $counterparties->isEmpty() || $paymentItems->count() < 5 || !$user) {
            echo "Не хватает данных для PaymentSeeder\n";
            return;
        }

        // paymentItems: 0=Аренда офиса, 1=Заработная плата, 2=Расходные материалы, 3=Услуги подрядчиков, 4=Налоги и сборы
        // accounts: 0=Расчётный счёт №1, 1=Расчётный счёт №2, 2=Касса
        // counterparties: 0=ООО Поставщик Альфа, 1=ИП Смирнов А.В., 2=АО ТехСервис, 3=ООО РентаГрупп, 4=ПАО Энергоресурс, 5=ООО Альфа-Трейд, 6=ИП Коваленко Д.М.

        // Обычные платежи
        $data = [
            ['amount' => 8500000,  'date' => Carbon::now(), 'acc' => 1, 'cp' => 2, 'item' => 3, 'purpose' => 'Разработка ПО', 'priority' => 'medium', 'status' => 'draft'],
            ['amount' => 4500000,  'date' => Carbon::now()->addDays(2), 'acc' => 0, 'cp' => 1, 'item' => 0, 'purpose' => 'Аренда склада', 'priority' => 'high', 'status' => 'pending'],
            ['amount' => 12000000, 'date' => Carbon::now()->addDays(4), 'acc' => 0, 'cp' => 3, 'item' => 0, 'purpose' => 'Офис, июль 2026', 'priority' => 'low', 'status' => 'approved'],
            ['amount' => 34000000, 'date' => Carbon::now()->addDays(6), 'acc' => 1, 'cp' => 4, 'item' => 4, 'purpose' => 'НДС за Q2', 'priority' => 'high', 'status' => 'in_registry'],
            ['amount' => 1250000,  'date' => Carbon::now()->addDay(), 'acc' => 2, 'cp' => 0, 'item' => 2, 'purpose' => 'Канцелярия', 'priority' => 'low', 'status' => 'draft'],
            ['amount' => 9500000,  'date' => Carbon::now()->addDays(3), 'acc' => 0, 'cp' => 4, 'item' => 3, 'purpose' => 'Управленческий консалтинг', 'priority' => 'medium', 'status' => 'pending'],
        ];

        foreach ($data as $d) {
            Payment::create([
                'amount' => $d['amount'],
                'planned_date' => $d['date']->toDateString(),
                'account_id' => $accounts[$d['acc']]->id,
                'counterparty_id' => $counterparties[$d['cp']]->id,
                'item_id' => $paymentItems[$d['item']]->id,
                'purpose' => $d['purpose'],
                'priority' => $d['priority'],
                'status' => $d['status'],
                'created_by' => $user->id,
            ]);
        }

        // Повторяющиеся платежи (шаблоны)
        $recurringData = [
            [
                'amount' => 12000000,
                'date' => Carbon::now()->addDays(20),
                'end_date' => Carbon::now()->endOfYear(),
                'acc' => 0,
                'cp' => 3,
                'item' => 0,
                'purpose' => 'Аренда офиса — ООО РентаГрупп',
                'priority' => 'low',
                'frequency' => 'monthly',
                'next_date' => Carbon::now()->addDays(20),
                'last_created' => Carbon::now()->subMonth(),
                'created_count' => 6,
            ],
            [
                'amount' => 58000000,
                'date' => Carbon::now()->addDays(3),
                'end_date' => null,
                'acc' => 0,
                'cp' => 5,
                'item' => 1,
                'purpose' => 'Зарплата — выплата сотрудникам',
                'priority' => 'high',
                'frequency' => 'monthly',
                'next_date' => Carbon::now()->addDays(3),
                'last_created' => Carbon::now()->subMonth(),
                'created_count' => 6,
            ],
            [
                'amount' => 34000000,
                'date' => Carbon::now()->addDays(85),
                'end_date' => null,
                'acc' => 1,
                'cp' => 4,
                'item' => 4,
                'purpose' => 'НДС — квартальный платёж',
                'priority' => 'high',
                'frequency' => 'quarterly',
                'next_date' => Carbon::now()->addDays(85),
                'last_created' => Carbon::now()->subQuarter(),
                'created_count' => 2,
            ],
            [
                'amount' => 1250000,
                'date' => Carbon::now()->addDays(7),
                'end_date' => null,
                'acc' => 2,
                'cp' => 0,
                'item' => 2,
                'purpose' => 'Расходные материалы — еженедельно',
                'priority' => 'low',
                'frequency' => 'weekly',
                'next_date' => Carbon::now()->addDays(7),
                'last_created' => Carbon::now()->subWeek(),
                'created_count' => 3,
                'template_status' => 'paused',
            ],
            [
                'amount' => 4500000,
                'date' => Carbon::now()->addDays(18),
                'end_date' => Carbon::now()->endOfYear(),
                'acc' => 0,
                'cp' => 1,
                'item' => 0,
                'purpose' => 'Услуги ИП Смирнов — склад',
                'priority' => 'medium',
                'frequency' => 'monthly',
                'next_date' => Carbon::now()->addDays(18),
                'last_created' => Carbon::now()->subMonth(),
                'created_count' => 4,
            ],
        ];

        foreach ($recurringData as $d) {
            Payment::create([
                'amount' => $d['amount'],
                'planned_date' => $d['date']->toDateString(),
                'next_date' => $d['next_date']->toDateString(),
                'end_date' => $d['end_date'] ? $d['end_date']->toDateString() : null,
                'account_id' => $accounts[$d['acc']]->id,
                'counterparty_id' => $counterparties[$d['cp']]->id,
                'item_id' => $paymentItems[$d['item']]->id,
                'purpose' => $d['purpose'],
                'priority' => $d['priority'],
                'status' => 'draft',
                'recurring' => true,
                'recurring_frequency' => $d['frequency'],
                'template_status' => $d['template_status'] ?? 'active',
                'created_count' => $d['created_count'],
                'last_created' => $d['last_created']->toDateString(),
                'created_by' => $user->id,
            ]);
        }
    }
}
