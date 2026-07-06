<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Payment;
use App\Models\Income;
use Illuminate\Support\Facades\Auth;
use App\Services\AuditService;

class ImportController extends Controller
{
    public function importPayments(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:2048',
        ]);

        $file = $request->file('file');
        $handle = fopen($file->getRealPath(), 'r');
        $header = fgetcsv($handle, 0, ';');
        $imported = 0;
        $errors = [];

        $lineNum = 1;
        while (($row = fgetcsv($handle, 0, ';')) !== false) {
            $lineNum++;
            if (count($row) < 6) {
                $errors[] = "Строка $lineNum: недостаточно полей";
                continue;
            }

            [$date, $accountName, $cpName, $itemName, $amount, $purpose] = $row;
            $priority = $row[6] ?? 'medium';

            // Найти счёт
            $account = \App\Models\Account::where('name', 'like', "%{$accountName}%")->first();
            if (!$account) { $errors[] = "Строка $lineNum: счёт '$accountName' не найден"; continue; }

            // Найти контрагента
            $cp = \App\Models\Counterparty::where('name', 'like', "%{$cpName}%")->first();
            if (!$cp) { $errors[] = "Строка $lineNum: контрагент '$cpName' не найден"; continue; }

            // Найти статью
            $item = \App\Models\Item::where('name', 'like', "%{$itemName}%")->first();
            if (!$item) { $errors[] = "Строка $lineNum: статья '$itemName' не найдена"; continue; }

            // Парсинг даты (дд.мм.гггг → гггг-мм-дд)
            $dateParsed = null;
            if (preg_match('/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/', trim($date), $m)) {
                $dateParsed = sprintf("%04d-%02d-%02d", $m[3], $m[2], $m[1]);
            } elseif (preg_match('/^\d{4}-\d{2}-\d{2}$/', trim($date))) {
                $dateParsed = trim($date);
            } else {
                $errors[] = "Строка $lineNum: неверный формат даты '$date'";
                continue;
            }

            // Парсинг суммы в копейки
            $amountStr = str_replace([' ', '₽', 'руб', 'р.'], '', trim($amount));
            // Запятую заменяем на точку
            $amountStr = str_replace(',', '.', $amountStr);
            if (!is_numeric($amountStr) || $amountStr <= 0) {
                $errors[] = "Строка $lineNum: неверная сумма '$amount'";
                continue;
            }

            // Конвертируем в копейки
            $amountKopecks = (int)round((float)$amountStr * 100);

            Payment::create([
                'amount' => $amountKopecks,
                'planned_date' => $dateParsed,
                'account_id' => $account->id,
                'counterparty_id' => $cp->id,
                'item_id' => $item->id,
                'purpose' => trim($purpose),
                'priority' => in_array($priority, ['high', 'medium', 'low']) ? $priority : 'medium',
                'status' => 'draft',
                'created_by' => Auth::id(),
            ]);
            $imported++;
        }

        fclose($handle);

        if ($imported > 0) {
            AuditService::log('import_payments', "Импорт заявок", "Импортировано: $imported");
        }

        return response()->json([
            'message' => "Импортировано $imported заявок",
            'imported' => $imported,
            'errors' => $errors,
        ]);
    }

    public function importIncomes(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:2048',
        ]);

        $file = $request->file('file');
        $handle = fopen($file->getRealPath(), 'r');
        $header = fgetcsv($handle, 0, ';');
        $imported = 0;
        $errors = [];

        $lineNum = 1;
        while (($row = fgetcsv($handle, 0, ';')) !== false) {
            $lineNum++;
            if (count($row) < 5) {
                $errors[] = "Строка $lineNum: недостаточно полей";
                continue;
            }

            [$date, $accountName, $cpName, $itemName, $amount] = $row;
            $purpose = $row[5] ?? '';

            $account = \App\Models\Account::where('name', 'like', "%{$accountName}%")->first();
            if (!$account) { $errors[] = "Строка $lineNum: счёт '$accountName' не найден"; continue; }

            $cp = \App\Models\Counterparty::where('name', 'like', "%{$cpName}%")->first();
            if (!$cp) { $errors[] = "Строка $lineNum: контрагент '$cpName' не найден"; continue; }

            $item = \App\Models\Item::where('name', 'like', "%{$itemName}%")->first();
            if (!$item) { $errors[] = "Строка $lineNum: статья '$itemName' не найдена"; continue; }

            $dateParsed = null;
            if (preg_match('/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/', trim($date), $m)) {
                $dateParsed = sprintf("%04d-%02d-%02d", $m[3], $m[2], $m[1]);
            } elseif (preg_match('/^\d{4}-\d{2}-\d{2}$/', trim($date))) {
                $dateParsed = trim($date);
            } else {
                $errors[] = "Строка $lineNum: неверный формат даты '$date'";
                continue;
            }

            $amountStr = str_replace([' ', '₽', 'руб', 'р.'], '', trim($amount));
            $amountStr = str_replace(',', '.', $amountStr);
            if (!is_numeric($amountStr) || $amountStr <= 0) {
                $errors[] = "Строка $lineNum: неверная сумма '$amount'";
                continue;
            }

            $amountKopecks = (int)round((float)$amountStr * 100);

            Income::create([
                'amount' => $amountKopecks,
                'planned_date' => $dateParsed,
                'account_id' => $account->id,
                'counterparty_id' => $cp->id,
                'item_id' => $item->id,
                'purpose' => trim($purpose),
                'status' => 'planned',
                'created_by' => Auth::id(),
            ]);
            $imported++;
        }

        fclose($handle);

        if ($imported > 0) {
            AuditService::log('import_incomes', "Импорт поступлений", "Импортировано: $imported");
        }

        return response()->json([
            'message' => "Импортировано $imported поступлений",
            'imported' => $imported,
            'errors' => $errors,
        ]);
    }
}
