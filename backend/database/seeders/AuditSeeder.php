<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\AuditLog;
use App\Models\User;
use Carbon\Carbon;

class AuditSeeder extends Seeder
{
    public function run()
    {
        $users = User::all();
        if ($users->isEmpty()) return;

        $admin = $users->firstWhere('role', 'admin');
        $initiator = $users->firstWhere('role', 'initiator');
        $manager = $users->firstWhere('role', 'manager');
        $treasurer = $users->firstWhere('role', 'treasurer');

        $now = Carbon::now();

        $logs = [
            ['user_id' => $admin?->id, 'action' => 'account_created', 'object' => 'Счёт «Расчётный №1»', 'details' => 'Начальный остаток: 500 000 ₽', 'created_at' => $now],
            ['user_id' => $admin?->id, 'action' => 'account_created', 'object' => 'Счёт «Расчётный №2»', 'details' => 'Начальный остаток: 200 000 ₽', 'created_at' => $now],
            ['user_id' => $admin?->id, 'action' => 'account_created', 'object' => 'Счёт «Касса»', 'details' => 'Начальный остаток: 50 000 ₽', 'created_at' => $now],
            ['user_id' => $admin?->id, 'action' => 'counterparty_created', 'object' => 'Контрагент «ООО Поставщик Альфа»', 'details' => 'ИНН: 7701234567', 'created_at' => $now],
            ['user_id' => $initiator?->id, 'action' => 'payment_created', 'object' => 'Заявка №1', 'details' => 'Разработка ПО, 85 000 ₽', 'created_at' => $now->copy()->addHour()],
            ['user_id' => $initiator?->id, 'action' => 'payment_created', 'object' => 'Заявка №2', 'details' => 'Аренда склада, 45 000 ₽', 'created_at' => $now->copy()->addHours(2)],
            ['user_id' => $initiator?->id, 'action' => 'payment_submitted', 'object' => 'Заявка №2', 'details' => 'Черновик → На согласовании', 'created_at' => $now->copy()->addHours(3)],
            ['user_id' => $initiator?->id, 'action' => 'income_created', 'object' => 'Поступление №1', 'details' => 'Аванс по договору №12, 650 000 ₽', 'created_at' => $now->copy()->addHours(4)],
        ];

        foreach ($logs as $log) {
            AuditLog::create($log);
        }
    }
}
