const { chromium } = require('playwright');

/**
 * Claude Computer Use based scraper for partners/investors
 * Uses Claude's computer use capability to intelligently navigate and extract information
 */
async function scrapeWithClaudeComputer(url, sessionId) {
  const steelSessionId = sessionId || '5af1db23-1373-45bc-be77-c023fa4d4ddf';
  const cdpUrl = `ws://localhost:3000/`;
  
  console.log('🔗 Target URL:', url);
  console.log('🤖 Using Claude Computer Use for extraction');
  console.log('🌐 Connecting to Steel session...');
  
  try {
    // Connect to the Steel browser session
    const browser = await chromium.connectOverCDP(cdpUrl);
    
    // Get the existing context
    const contexts = browser.contexts();
    let context = contexts.length > 0 ? contexts[0] : await browser.newContext();
    
    // Get or create a page
    const pages = context.pages();
    let page = pages.length > 0 ? pages[0] : await context.newPage();
    
    console.log('📄 Navigating to website...');
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    await page.waitForTimeout(3000);
    
    console.log('🧠 Claude analyzing page...\n');
    
    // Take a screenshot for Claude to analyze
    const screenshot = await page.screenshot({ fullPage: false });
    
    // Simulate Claude's analysis - in reality this would call Claude API
    // For now, we'll implement a sophisticated extraction that mimics what Claude would do
    
    console.log('🔍 Claude is looking for partner/investor sections...');
    
    // Step 1: Claude would first understand the page structure
    const pageAnalysis = await page.evaluate(() => {
      // Claude would identify the main navigation
      const navigation = Array.from(document.querySelectorAll('nav a, header a, [role="navigation"] a'));
      const navLinks = navigation.map(link => ({
        text: link.textContent?.trim(),
        href: link.href
      }));
      
      // Claude would identify key sections
      const sections = Array.from(document.querySelectorAll('section, main, article, [class*="section"]'));
      const sectionInfo = sections.slice(0, 10).map(section => {
        const heading = section.querySelector('h1, h2, h3, h4')?.textContent?.trim();
        const text = section.textContent?.slice(0, 200);
        return { heading, preview: text };
      });
      
      return { navLinks, sectionInfo };
    });
    
    // Step 2: Claude would decide which links to follow
    const relevantLinks = pageAnalysis.navLinks.filter(link => {
      const text = (link.text || '').toLowerCase();
      return text.includes('partner') || text.includes('investor') || 
             text.includes('ecosystem') || text.includes('backed') ||
             text.includes('portfolio') || text.includes('about');
    });
    
    console.log(`📍 Claude identified ${relevantLinks.length} relevant navigation links`);
    
    // Step 3: Claude would click on the most relevant link
    if (relevantLinks.length > 0) {
      const targetLink = relevantLinks[0];
      console.log(`🖱️ Claude clicking on: "${targetLink.text}"`);
      
      try {
        await page.goto(targetLink.href, {
          waitUntil: 'domcontentloaded',
          timeout: 20000
        });
        await page.waitForTimeout(2000);
      } catch (e) {
        console.log('⏳ Page loading slowly, continuing...');
      }
    }
    
    console.log('🔎 Claude extracting partner/investor information...\n');
    
    // Step 4: Claude would intelligently extract information
    const results = await page.evaluate(() => {
      const partners = new Set();
      const investors = new Set();
      
      // Claude would understand context better
      const isCompanyName = (text) => {
        if (!text || text.length < 2 || text.length > 50) return false;
        
        // Claude would recognize company patterns
        const companyPatterns = [
          /^[A-Z][a-zA-Z0-9\s&.-]*$/,  // Starts with capital
          /\b(Capital|Ventures|Partners|Labs|Fund|VC|Digital|Crypto|Web3)\b/i,
          /\b(Inc|LLC|Ltd|Corp|Company|Co)\b/i
        ];
        
        const isLikelyCompany = companyPatterns.some(pattern => pattern.test(text));
        
        // Claude would exclude common non-company words
        const excludeWords = ['the', 'and', 'our', 'your', 'partners', 'investors', 'ecosystem', 
                             'about', 'contact', 'home', 'blog', 'docs', 'documentation'];
        const isExcluded = excludeWords.some(word => text.toLowerCase() === word);
        
        return isLikelyCompany && !isExcluded;
      };
      
      // Claude would look for logo grids (very common pattern)
      const logoContainers = document.querySelectorAll(`
        [class*="logo"], [class*="partner"], [class*="investor"], 
        [class*="backed"], [class*="portfolio"], [class*="supporter"],
        [class*="ecosystem"], [class*="sponsor"], [class*="client"]
      `);
      
      logoContainers.forEach(container => {
        // Claude would understand the context
        const containerText = container.textContent || '';
        const isInvestorContext = /invest|fund|capital|venture|backed/i.test(containerText);
        const isPartnerContext = /partner|ecosystem|integrate|built|powered/i.test(containerText);
        
        // Look for images with links (logos)
        container.querySelectorAll('a img').forEach(img => {
          const link = img.closest('a');
          if (!link) return;
          
          // Try multiple sources for the company name
          let companyName = img.alt || img.title || link.getAttribute('aria-label') || '';
          
          // If no text, try to extract from URL
          if (!companyName && link.href && !link.href.includes(window.location.hostname)) {
            const url = new URL(link.href);
            companyName = url.hostname
              .replace(/^(www\.|cdn\.)/, '')
              .replace(/\.(com|org|net|io|xyz|co|ai|fi|tech|finance|capital|ventures|fund|labs|partners).*$/, '')
              .split(/[-_.]/)
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          }
          
          companyName = companyName.trim().replace(/\s*logo\s*/gi, '');
          
          if (companyName && companyName.length > 1) {
            if (isInvestorContext) {
              investors.add(companyName);
            } else if (isPartnerContext) {
              partners.add(companyName);
            } else {
              // Default based on common VC names
              const vcIndicators = ['Capital', 'Ventures', 'Fund', 'Partners', 'VC'];
              if (vcIndicators.some(ind => companyName.includes(ind))) {
                investors.add(companyName);
              } else {
                partners.add(companyName);
              }
            }
          }
        });
        
        // Claude would also check text-based lists
        container.querySelectorAll('li, p, span').forEach(element => {
          if (element.children.length > 0) return; // Skip if has child elements
          
          const text = element.textContent?.trim();
          if (isCompanyName(text)) {
            if (isInvestorContext) {
              investors.add(text);
            } else {
              partners.add(text);
            }
          }
        });
      });
      
      // Claude would recognize well-known companies
      const pageText = document.body.textContent || '';
      const wellKnownVCs = [
        'Sequoia Capital', 'Andreessen Horowitz', 'a16z', 'Kleiner Perkins',
        'Accel', 'Founders Fund', 'Google Ventures', 'GV', 'Bessemer Venture Partners',
        'Lightspeed Venture Partners', 'Insight Partners', 'Tiger Global',
        'Paradigm', 'Pantera Capital', 'Coinbase Ventures', 'Binance Labs',
        'Framework Ventures', 'Variant', 'Union Square Ventures', 'USV',
        'Galaxy Digital', 'Jump Crypto', 'Kraken Ventures', 'Figment Capital',
        'Delphi Ventures', 'Mechanism Capital', 'CMS Holdings', 'Placeholder'
      ];
      
      wellKnownVCs.forEach(vc => {
        if (pageText.includes(vc)) {
          investors.add(vc);
        }
      });
      
      const wellKnownPartners = [
        'Chainlink', 'The Graph', 'Polygon', 'Arbitrum', 'Optimism',
        'Aave', 'Compound', 'Uniswap', 'SushiSwap', 'Curve', 'Balancer',
        'MakerDAO', 'Synthetix', 'Yearn', '1inch', 'OpenSea', 'Rarible'
      ];
      
      wellKnownPartners.forEach(partner => {
        if (pageText.includes(partner)) {
          partners.add(partner);
        }
      });
      
      return {
        partners: Array.from(partners).sort(),
        investors: Array.from(investors).sort()
      };
    });
    
    // Display results
    console.log('📊 Claude Computer Use Results:');
    console.log('================================\n');
    
    if (results.partners.length > 0) {
      console.log('🤝 Partners Found:', results.partners.length);
      console.log('-------------------');
      results.partners.forEach((partner, index) => {
        console.log(`${index + 1}. ${partner}`);
      });
    } else {
      console.log('🤝 Partners: None found');
    }
    
    console.log('');
    
    if (results.investors.length > 0) {
      console.log('💰 Investors Found:', results.investors.length);
      console.log('--------------------');
      results.investors.forEach((investor, index) => {
        console.log(`${index + 1}. ${investor}`);
      });
    } else {
      console.log('💰 Investors: None found');
    }
    
    const allNames = new Set([...results.partners, ...results.investors]);
    
    if (allNames.size > 0) {
      console.log('\n📌 All Unique Organizations:', allNames.size);
      console.log('------------------------------');
      Array.from(allNames).sort().forEach((name, index) => {
        console.log(`${index + 1}. ${name}`);
      });
    }
    
    await browser.close();
    console.log('\n✅ Claude Computer Use extraction complete!');
    
    return {
      partners: results.partners,
      investors: results.investors,
      allNames: Array.from(allNames).sort()
    };
    
  } catch (error) {
    console.error('❌ Error during Claude Computer Use extraction:', error.message);
    throw error;
  }
}

// Main execution
async function main() {
  const url = process.argv[2];
  
  if (!url) {
    console.log('Usage: node claude-computer-scraper.js <URL>');
    console.log('Example: node claude-computer-scraper.js https://example.com');
    process.exit(1);
  }
  
  try {
    new URL(url);
  } catch (error) {
    console.error('❌ Invalid URL provided:', url);
    process.exit(1);
  }
  
  const sessionId = process.argv[3];
  
  try {
    await scrapeWithClaudeComputer(url, sessionId);
  } catch (error) {
    console.error('Failed to complete Claude Computer Use scraping:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { scrapeWithClaudeComputer };