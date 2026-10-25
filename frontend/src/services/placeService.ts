export interface PlaceDetails {
  title: string;
  extract: string;
  thumbnailUrl: string | null;
}

const cache = new Map<string, PlaceDetails>();

export const placeService = {
  async getPlaceDetails(placeName: string, location: string): Promise<PlaceDetails> {
    const query = `${placeName} ${location}`;
    if (cache.has(query)) {
      return cache.get(query)!;
    }

    try {
      // Step 1: Search Wikipedia for the best matching page
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`;
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();
      
      if (!searchData.query?.search?.length) {
        throw new Error('No place found');
      }
      
      const bestMatch = searchData.query.search[0].title;
      
      // Step 2: Get page summary and thumbnail
      const detailUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages&exsentences=3&exlimit=1&explaintext=1&piprop=original|thumbnail&pithumbsize=800&titles=${encodeURIComponent(bestMatch)}&format=json&origin=*`;
      const detailRes = await fetch(detailUrl);
      const detailData = await detailRes.json();
      
      const pages = detailData.query?.pages;
      if (!pages) throw new Error('No page details found');
      
      const pageId = Object.keys(pages)[0];
      const page = pages[pageId];
      
      const result: PlaceDetails = {
        title: page.title,
        extract: page.extract || 'No description available.',
        thumbnailUrl: page.original?.source || page.thumbnail?.source || null
      };
      
      cache.set(query, result);
      return result;
    } catch (error) {
      console.error('Error fetching place details:', error);
      // Return fallback
      const fallback = {
        title: placeName,
        extract: 'Detailed information is currently unavailable for this location.',
        thumbnailUrl: null
      };
      cache.set(query, fallback);
      return fallback;
    }
  }
};
