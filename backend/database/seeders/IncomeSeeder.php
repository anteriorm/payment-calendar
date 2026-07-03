<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Income;
use App\Models\Account;
use App\Models\Counterparty;
use App\Models\Item;
use Illuminate\Support\Facades\DB;

class IncomeSeeder extends Seeder
{
    public function run()
    {
        $account = Account::first();
        $counterparty = Counterparty::first();
        $incomeItem = Item::where('type', 'income')->first();

        if (!$account || !$counterparty || !$incomeItem) {
            echo "⚠️  Не хватает данных для IncomeSeeder\n";
            return;
        }

        // Допустимые статусы: planned, received, canceled
        $statuses = ['planned', 'received', 'canceled'];
        $dates = [
            now()->subDays(2)->toDateString(),
            now()->subDay()->toDateString(),
            now()->addDay()->toDateString(),
        ];

        foreach ($statuses as $i => $status) {
            Income::create([
                'amount' => rand(20000, 600000),
                'planned_date' => $dates[$i],
                'account_id' => $account->id,
                'counterparty_id' => $counterparty->id,
                'item_id' => $incomeItem->id,
                'purpose' => "Поступление №" . ($i + 1),
                'status' => $status,
            ]);
        }
    }
}
