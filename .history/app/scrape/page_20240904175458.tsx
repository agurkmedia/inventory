const handleScrape = async () => {
  setLoading(true);
  setError('');
  try {
    const res = await fetch('/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, itemCount }),
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to fetch item links');
    }
    const itemLinks = await res.json();

    console.log(`Total item links found: ${itemLinks.length}`);
    setScrapedData(itemLinks);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'An unknown error occurred');
  } finally {
    setLoading(false);
  }
};

// ... (rest of the code remains the same)