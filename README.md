# grades-unt

## Choosing classes is a gamble. It shouldn't be.
You don't always know what you're signing up for (easy or hard!) until it's too late. We created a website to view all the grades of every class AND professor at UNT.

## View (almost) any class at UNT from last semester: 
We got data from UNT about all the grade distributions from Fall 2025. With this data, we made an app to easily view all the data. 

### **Links:** 
- [untgrades.app](https://untgrades.app)

## Technical Implementation
### Frontend: 
- React v19.2.3
- Next.js 16.1.6
- Typescript 
- Tailwind CSS (v4) 
- Recharts (v3.7.0) - draws grade distribution charts
- jsPDF + jspdf-autotable (4.2.0, 5.0.7) - PDF exporter
- Vercel Analytics + Vercel Speed Insights - real-user page views, Web Vitals, and route performance monitoring

### Data Delivery:
- Static encrypted blobs generated at build time from CSV exports
- Client-side WebCrypto decryption for course and professor pages
- Manifest-driven search that avoids live database calls
- No Supabase/Prisma runtime dependency for user-facing reads

### Hosting: 
- Vercel (hosting the website itself and serving static encrypted assets)
- Optional environment key for encrypt/decrypt parity across builds

### Observability:
- Vercel Speed Insights helps monitor real-user loading performance across the home page, search-driven navigation, and the encrypted course and instructor pages.
- Speed Insights is useful for finding slow routes and poor Web Vitals, but it does not replace direct load benchmarking or client-side profiling.

### Estimated Speedup vs Supabase:
- This is a rough estimate, not a benchmark.
- Search suggestions: about 3x to 10x faster perceived response time once the manifest is cached, because the browser filters static JSON instead of waiting on a database query.
- Course and instructor pages: about 2x to 6x faster perceived navigation time, because the browser fetches one encrypted blob from the CDN and decrypts locally instead of going through Prisma + Supabase.
- Cold starts, DB connection failures, and query latency spikes are removed from the user-facing path, so speed is more consistent even when the raw gain varies by network and device.

## File Structure: 
/unt-grade-distribution: contains all the code. put it all into a folder for "modulization".

documentation files (any .md files): in the repo's root file. makes it easier to see and read all the documentation docs that have been made (e.g. look at [DOCUMENTATION.md](https://github.com/dyl-joseph/grades-unt/blob/main/DOCUMENTATION.md)). 

## Contributions: 

### Maintainers:

[Dylan Joseph](https://github.com/dyl-joseph)

[Gautham Nair](https://github.com/GauthamRNair)

[Akhil Tumati](https://github.com/YouSoMoose)

### Initial Contributors:

[Sai Are](https://github.com/FrostNinja397)

## Planned Features

- **SPOT Evaluations** — Integrate Student Perceptions of Teaching data for instructors
- **More Semesters** — Expand grade distribution data to cover additional semesters
- **Smarter client aggregates** — Keep compare-page aggregation fast by precomputing or indexing more summary data in the encrypted manifest layer, without reintroducing a live database dependency.
