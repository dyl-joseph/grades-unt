# grades-unt

## Choosing classes is a gamble. It shouldn't be.
You don't always know what you're signing up for (easy or hard!) until it's too late. We created a website to view all the grades of every class AND professor at UNT.

## View (almost) any class at UNT from last semester: 
We got data from UNT about all the grade distributions from Fall 2025. With this data, we made an app to easily view all the data. 

### **Links:** 
- [untgrades.app](https://untgrades.app) (if you are **NOT** on school Wi-Fi)
- [unt-grades.vercel.app](https://unt-grades.vercel.app) (If you **ARE** on school Wi-Fi)

## Technical Implementation
### Frontend: 
- React v19.2.3
- Next.js 16.1.6
- Typescript 
- Tailwind CSS (v4) 
- Recharts (v3.7.0) - draws grade distribution)
- jsPDF + jspdf-autotable (4.2.0, 5.0.7) - PDF exporter) 

### Backend:
- postgress-sql
- Next.js API (16.1.6) - routes data 
- Prisma ORM (7.4.2) - fetches data from Supabase and gives it to the website
- PostgreSQL - database manager in Supabase
- pg [node-postgress] (8.19.0) - allow the website to use postgress and process postrgress data

### Hosting: 
- Supabase (database)
- Vercel (hosting the website itself)

## File Structure: 
/unt-grade-distribution: contains all the code. put it all into a folder for "modulization".

documentation files (any .md files): in the repo's root file. makes it easier to see and read all the documentation docs that have been made (e.g. look at [DOCUMENTATION.md](https://github.com/dyl-joseph/grades-unt/blob/main/DOCUMENTATION.md)). 

## Contributions: 

### Maintainers:

[Dylan Joseph](https://github.com/dyl-joseph)

[Gautham Nair](https://github.com/GauthamRNair)

### Initial Contributors:

[Akhil Tumati](https://github.com/YouSoMoose)

[Sai Are](https://github.com/FrostNinja397)
