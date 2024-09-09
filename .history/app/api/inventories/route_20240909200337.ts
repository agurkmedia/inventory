export async function PUT(req: Request) {
    console.log("PUT request received");
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        console.log("Not authorized");
        return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    try {
        // Parse the URL to extract query parameters
        const url = new URL(req.url);
        const id = url.searchParams.get('id'); // Get the 'id' parameter from the query string

        console.log("Inventory ID:", id);

        const { name } = await req.json();
        console.log("New name:", name);

        if (!id || !name) {
            console.log("Missing id or name");
            return NextResponse.json({ error: 'ID and name are required' }, { status: 400 });
        }

        // Check if the inventory belongs to the user
        const inventory = await prisma.inventory.findFirst({
            where: { id: id as string, userId: session.user.id },
        });

        console.log("Found inventory:", inventory);

        if (!inventory) {
            console.log("Inventory not found or not authorized");
            return NextResponse.json({ error: 'Inventory not found or not authorized' }, { status: 404 });
        }

        const updatedInventory = await prisma.inventory.update({
            where: { id: id as string },
            data: { name },
        });

        console.log("Updated inventory:", updatedInventory);

        return NextResponse.json(updatedInventory);
    } catch (error) {
        console.error('Error updating inventory:', error);
        return NextResponse.json({ error: 'Failed to update inventory', details: error.message }, { status: 500 });
    }
}
