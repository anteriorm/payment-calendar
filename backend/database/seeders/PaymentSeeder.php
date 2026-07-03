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
        $account = Account::first();
        $counterparty = Counterparty::first();
        $item = Item::where('type', 'payment')->first();
        $user = User::first();

        if (!$account || !$counterparty || !$item || !$user) {
            echo "Не хватает данных для создания платежей. Проверь сиды.\n";
            return;
        }

        $statuses = ['draft', 'pending', 'approved', 'in_registry', 'paid'];
        $dates = [
            Carbon::now()->subDays(3),
            Carbon::now()->subDays(2),
            Carbon::now()->subDay(),
            Carbon::now()->addDay(),
            Carbon::now()->addDays(2),
        ];

        foreach ($statuses as $i => $status) {
            Payment::create([
                'amount' => rand(10000, 500000),
                'planned_date' => $dates[$i]->toDateString(),
                'account_id' => $account->id,
                'counterparty_id' => $counterparty->id,
                'item_id' => $item->id,
                'purpose' => "Тестовый платёж №{$i}",
                'priority' => ['high', 'medium', 'low'][array_rand(['high', 'medium', 'low'])],
                'status' => $status,
                'created_by' => $user->id,
            ]);
        }
    }
}
