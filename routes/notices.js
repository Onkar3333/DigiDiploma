const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { logCollegeNoticesRefresh } = require('../utils/logger');
const router = express.Router();

// Cache for notices to avoid too many requests
let noticesCache = {
    data: [],
    lastUpdated: null,
    cacheDuration: 30 * 60 * 1000 // 30 minutes
};

// Function to fetch notices from college website
async function fetchCollegeNotices() {
    try {
        console.log('Fetching notices from Government Polytechnic, Awasari (Kh.) website...');
        
        // Fetch the college website
        const response = await axios.get('https://www.gpawasari.ac.in', {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(response.data);
        const notices = [];

        // Try different selectors to find notices
        // Common selectors for notice boards
        const selectors = [
            '.notice-board a',
            '.notices a',
            '.announcements a',
            '.news a',
            'table a[href*="notice"]',
            'table a[href*="pdf"]',
            '.content a[href*="notice"]',
            '.content a[href*="pdf"]',
            'a[href*="notice"]',
            'a[href*="pdf"]',
            // More specific selectors for college websites
            'table tr td a',
            '.table a',
            'tbody tr td a',
            'a[href*=".pdf"]',
            'a[href*=".doc"]',
            'a[href*=".docx"]',
            'a[href*="download"]',
            'a[href*="circular"]',
            'a[href*="admission"]',
            'a[href*="timetable"]',
            'a[href*="schedule"]',
            'a[href*="form"]',
            'a[href*="brochure"]',
            'a[href*="notification"]',
            'a[href*="invitation"]',
            'a[href*="quotation"]',
            // Generic table links
            'table a',
            'tr td a',
            '.main-content a',
            '.container a',
            '.wrapper a'
        ];

        let foundNotices = false;

        for (const selector of selectors) {
            const elements = $(selector);
            if (elements.length > 0) {
                console.log(`Found ${elements.length} notices using selector: ${selector}`);
                
                elements.each((index, element) => {
                    const $element = $(element);
                    const title = $element.text().trim();
                    const link = $element.attr('href');
                    
                    // Filter out empty titles and non-notice links
                    if (title && title.length > 3 && link && !link.includes('mailto:') && !link.includes('tel:') && !link.includes('javascript:')) {
                        const fullLink = link.startsWith('http') ? link : `https://www.gpawasari.ac.in${link}`;
                        
                        // Skip if already added (avoid duplicates)
                        const isDuplicate = notices.some(notice => notice.title === title);
                        if (isDuplicate) return;
                        
                        // Determine notice type based on title keywords
                        let type = 'general';
                        const titleLower = title.toLowerCase();
                        
                        if (titleLower.includes('urgent') || titleLower.includes('admission') || titleLower.includes('notification') || titleLower.includes('circular')) {
                            type = 'urgent';
                        } else if (titleLower.includes('fee') || titleLower.includes('accreditation') || titleLower.includes('scholarship') || titleLower.includes('important') || titleLower.includes('mandatory')) {
                            type = 'important';
                        } else if (titleLower.includes('timetable') || titleLower.includes('schedule') || titleLower.includes('practical') || titleLower.includes('examination')) {
                            type = 'important';
                        }

                        notices.push({
                            title: title,
                            link: fullLink,
                            type: type,
                            date: new Date().toISOString(),
                            isNew: notices.length < 5 // Mark first 5 as new
                        });
                        
                        foundNotices = true;
                    }
                });
                
                if (foundNotices) break;
            }
        }

        // If no notices found through scraping, fall back to static data
        if (!foundNotices || notices.length === 0) {
            console.log('No notices found through scraping, using fallback data');
            return [
                {
                    title: "Person With Disabilities",
                    link: "https://www.gpawasari.ac.in",
                    type: "important",
                    date: new Date().toISOString(),
                    isNew: true
                },
                {
                    title: "Fee Structure FY and DSY 2024-2025",
                    link: "https://www.gpawasari.ac.in",
                    type: "general",
                    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                    isNew: false
                },
                {
                    title: "NBA Accreditation of IF, ME, EJ, EE, CO, AE Department",
                    link: "https://www.gpawasari.ac.in",
                    type: "important",
                    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                    isNew: false
                },
                {
                    title: "Audit Report File 2022-23",
                    link: "https://www.gpawasari.ac.in",
                    type: "general",
                    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                    isNew: false
                },
                {
                    title: "NBA Accreditation of Automobile Engineering Department",
                    link: "https://www.gpawasari.ac.in",
                    type: "important",
                    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                    isNew: false
                },
                {
                    title: "Important Notice to SC and ST students related Maha-DBT scholarship",
                    link: "https://www.gpawasari.ac.in",
                    type: "urgent",
                    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                    isNew: false
                },
                {
                    title: "Institute Level Admission (2024-25) Round for First",
                    link: "https://www.gpawasari.ac.in",
                    type: "urgent",
                    date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
                    isNew: false
                }
            ];
        }

        console.log(`Successfully fetched ${notices.length} notices from college website`);
        return notices.slice(0, 10); // Limit to 10 notices

    } catch (error) {
        console.error('Error fetching college notices:', error);
        console.log('Using fallback notices due to scraping error');
        
        // Return fallback notices if scraping fails
        return [
            {
                title: "Person With Disabilities",
                link: "https://www.gpawasari.ac.in",
                type: "important",
                date: new Date().toISOString(),
                isNew: true
            },
            {
                title: "Fee Structure FY and DSY 2024-2025",
                link: "https://www.gpawasari.ac.in",
                type: "general",
                date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                isNew: false
            },
            {
                title: "NBA Accreditation of IF, ME, EJ, EE, CO, AE Department",
                link: "https://www.gpawasari.ac.in",
                type: "important",
                date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                isNew: false
            },
            {
                title: "Audit Report File 2022-23",
                link: "https://www.gpawasari.ac.in",
                type: "general",
                date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                isNew: false
            },
            {
                title: "NBA Accreditation of Automobile Engineering Department",
                link: "https://www.gpawasari.ac.in",
                type: "important",
                date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                isNew: false
            },
            {
                title: "Important Notice to SC and ST students related Maha-DBT scholarship",
                link: "https://www.gpawasari.ac.in",
                type: "urgent",
                date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                isNew: false
            },
            {
                title: "Institute Level Admission (2024-25) Round for First",
                link: "https://www.gpawasari.ac.in",
                type: "urgent",
                date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
                isNew: false
            }
        ];
    }
}

// Get all notices
router.get('/', async (req, res) => {
    try {
        // Check if cache is valid
        const now = Date.now();
        if (!noticesCache.lastUpdated || (now - noticesCache.lastUpdated) > noticesCache.cacheDuration) {
            console.log('Fetching fresh notices from college website...');
            noticesCache.data = await fetchCollegeNotices();
            noticesCache.lastUpdated = now;
        }

        res.json({
            notices: noticesCache.data,
            lastUpdated: noticesCache.lastUpdated,
            source: 'Government Polytechnic, Awasari (Kh.)'
        });
    } catch (error) {
        console.error('Error getting notices:', error);
        res.status(500).json({ error: 'Failed to fetch notices' });
    }
});

// Force refresh notices (admin only)
router.post('/refresh', async (req, res) => {
    try {
        console.log('Force refreshing notices...');
        noticesCache.data = await fetchCollegeNotices();
        noticesCache.lastUpdated = Date.now();
        
        const result = {
            message: 'Notices refreshed successfully',
            count: noticesCache.data.length,
            lastUpdated: noticesCache.lastUpdated,
            source: 'Government Polytechnic, Awasari (Kh.)'
        };

        // Log the refresh action
        await logCollegeNoticesRefresh(req, result);
        
        res.json(result);
    } catch (error) {
        console.error('Error refreshing notices:', error);
        res.status(500).json({ error: 'Failed to refresh notices' });
    }
});

// Get notice statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = {
            total: noticesCache.data.length,
            new: noticesCache.data.filter(n => n.isNew).length,
            urgent: noticesCache.data.filter(n => n.type === 'urgent').length,
            important: noticesCache.data.filter(n => n.type === 'important').length,
            general: noticesCache.data.filter(n => n.type === 'general').length,
            lastUpdated: noticesCache.lastUpdated
        };
        
        res.json(stats);
    } catch (error) {
        console.error('Error getting notice stats:', error);
        res.status(500).json({ error: 'Failed to get notice statistics' });
    }
});

module.exports = router; 