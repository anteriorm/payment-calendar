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

        // paymentItems: 0=Аренда, 1=Зарплата, 2=Расходные материалы, 3=Услуги подрядчиков, 4=Налоги
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
    }
}
