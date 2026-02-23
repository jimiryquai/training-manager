'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/app/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/card';
import { toast } from '@/app/hooks/use-toast';

type Exercise = {
    id: string;
    name: string;
    movement_category: string;
    progression_level: number;
    exercise_type: string;
};

export function LibraryPage() {
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [name, setName] = useState('');
    const [category, setCategory] = useState<string>('squat');
    const [level, setLevel] = useState<number>(1);
    const [type, setType] = useState<string>('dynamic');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchExercises = async () => {
        try {
            const res = await fetch('/trpc/library.getExercises');
            if (res.ok) {
                const data = await res.json() as any;
                setExercises(data.result.data);
            }
        } catch (e) {
            console.error(e);
            toast({ title: 'Error', description: 'Failed to fetch exercises', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExercises();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch('/trpc/library.addExercise', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    movement_category: category,
                    progression_level: level,
                    exercise_type: type,
                }),
            });

            if (res.ok) {
                toast({ title: 'Success', description: 'Exercise added' });
                setName('');
                setLevel(1);
                fetchExercises();
            } else {
                throw new Error('Failed to add exercise');
            }
        } catch (e) {
            console.error(e);
            toast({ title: 'Error', description: 'Failed to add exercise', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Exercise Library</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1 border">
                    <CardHeader>
                        <CardTitle>Add Master Lift</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Exercise Name</label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Back Squat"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Movement Category</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                >
                                    <option value="squat">Squat</option>
                                    <option value="hinge">Hinge</option>
                                    <option value="push">Push</option>
                                    <option value="pull">Pull</option>
                                    <option value="carry">Carry</option>
                                    <option value="core">Core</option>
                                    <option value="cardio">Cardio</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Progression Level (1-10)</label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={level}
                                    onChange={(e) => setLevel(parseInt(e.target.value))}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Exercise Type</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                >
                                    <option value="dynamic">Dynamic</option>
                                    <option value="isometric">Isometric</option>
                                    <option value="eccentric">Eccentric</option>
                                </select>
                            </div>
                            <Button type="submit" className="w-full" disabled={isSubmitting || !name}>
                                {isSubmitting ? 'Adding...' : 'Add Exercise'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2 border">
                    <CardHeader>
                        <CardTitle>Library</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p>Loading exercises...</p>
                        ) : exercises.length === 0 ? (
                            <p className="text-muted-foreground">No exercises found. Add one to get started.</p>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Level</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Type</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {exercises.map((exercise) => (
                                            <TableRow key={exercise.id}>
                                                <TableCell className="font-medium">{exercise.progression_level}</TableCell>
                                                <TableCell>{exercise.name}</TableCell>
                                                <TableCell className="capitalize">{exercise.movement_category}</TableCell>
                                                <TableCell className="capitalize">{exercise.exercise_type}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
