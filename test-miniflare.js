const test = async () => {
    const res = await fetch('http://localhost:8787/_test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'test_library_addExercise',
            args: [{
                tenant_id: 'tenant-test',
                name: 'Back Squat',
                movement_category: 'squat',
                progression_level: 5,
                exercise_type: 'dynamic',
            }]
        })
    });
    console.log(res.status);
    console.log(await res.text());
}
test();
