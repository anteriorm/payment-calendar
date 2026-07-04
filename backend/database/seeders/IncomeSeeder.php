<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Income;
use App\Models\Account;
use App\Models\Counterparty;
use App\Models\Item;
use App\Models\User;
use Carbon\Carbon;

class IncomeSeeder extends Seeder
{
    public function run()
    {
        $accounts = Account::all();
        $counterparties = Counterparty::all();
        $incomeItems = Item::where('type', 'income')->get();
        $user = User::where('role', 'initiator')->first() ?? User::first();

        if ($accounts->isEmpty() || $counterparties->isEmpty() || $incomeItems->isEmpty() || !$user) {
            echo "Не хватает данных для IncomeSeeder\n";
            return;
        }

        $data = [
            ['amount' => 65000000, 'date' => Carbon::now()->subDays(5), 'acc' => 0, 'cp' => 2, 'item' => 0, 'purpose' => 'Аванс по договору №12', 'status' => 'received'],
            ['amount' => 12000000, 'date' => Carbon::now()->subDays(3), 'acc' => 1, 'cp' => 6, 'item' => 0, 'purpose' => 'Оплата счёта № 145', 'status' => 'received'],
            ['amount' => 28000000, 'date' => Carbon::now()->addDays(2), 'acc' => 0, 'cp' => 5, 'item' => 0, 'purpose' => 'Оплата за услуги июнь', 'status' => 'confirmed'],
            ['amount' => 4500000,  'date' => Carbon::now()->addDays(4), 'acc' => 1, 'cp' => 6, 'item' => 1, 'purpose' => 'Возврат переплаты', 'status' => 'planned'],
            ['amount' => 3200000,  'date' => Carbon::now()->addDays(7), 'acc' => 2, 'cp' => 4, 'item' => 1, 'purpose' => 'Проценты по депозиту', 'status' => 'planned'],
        ];

        foreach ($data as $d) {
            Income::create([
                'amount' => $d['amount'],
                'planned_date' => $d['date']->toDateString(),
                'account_id' => $accounts[$d['acc']]->id,
                'counterparty_id' => $counterparties[$d['cp']]->id,
                'item_id' => $incomeItems[$d['item']]->id,
                'purpose' => $d['purpose'],
                'status' => $d['status'],
                'created_by' => $user->id,
            ]);
        }
    }
}
