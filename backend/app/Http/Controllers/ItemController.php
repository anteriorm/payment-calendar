<?php

namespace App\Http\Controllers;

use App\Models\Item;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;
use App\Services\AuditService;

class ItemController extends Controller
{
    public function index()
    {
        return response()->json(Item::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|max:20',
            'name' => 'required|string|max:255',
            'type' => 'required|in:income,payment',
            'group' => 'nullable|string|max:255',
        ]);

        $item = Item::create($validated);

        AuditService::log('item_created', "Статья «{$item->name}»");

        return response()->json($item, 201);
    }

    public function show(Item $item)
    {
        return response()->json($item);
    }

    public function update(Request $request, Item $item)
    {
        $validated = $request->validate([
            'code' => 'sometimes|string|max:20',
            'name' => 'sometimes|string|max:255',
            'type' => 'sometimes|in:income,payment',
            'group' => 'sometimes|nullable|string|max:255',
        ]);

        $item->update($validated);

        AuditService::log('item_updated', "Статья «{$item->name}»");

        return response()->json($item);
    }

    public function destroy(Item $item)
    {
        if (auth()->user()->role !== 'admin') {
            return response()->json(['message' => 'Доступ запрещён'], 403);
        }

        try {
            $name = $item->name;
            $item->delete();
            AuditService::log('item_deleted', "Статья «{$name}»");
        } catch (QueryException $e) {
            return response()->json(['message' => 'Невозможно удалить статью — на неё ссылаются платежи или поступления'], 422);
        }

        return response()->json(['message' => 'Статья удалена']);
    }
}
