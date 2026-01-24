/**
 * Import Employee Data
 * 
 * This script imports the employee roster into the database:
 * - Creates new position groups (Replay, Camera)
 * - Creates positions with hourly rates
 * - Creates staff resources
 * - Links staff to their positions with custom rates
 * 
 * Run: node import-employees.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'rms_pro',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 5432,
});

// Employee data from the spreadsheet
const employeeData = [
    // TD positions
    { name: "Brian Stephens", position: "TD", rate: 47.7272, startDate: "2016-07-27", phone: "310-906-9495", email: "pfetv@mac.com", location: "San Mateo" },
    { name: "Bobby Cullen", position: "TD", rate: 45.4545, startDate: "2022-12-10", phone: "916-600-0288", email: "bobbycullen@mac.com", location: "Walnut Creek" },
    { name: "David Hasselfeld", position: "TD", rate: 50.0000, startDate: "2016-07-27", phone: "925-917-6617", email: "davwhass@gmail.com", location: "Martinez" },
    { name: "Derrick Duario", position: "TD", rate: 40.9091, startDate: "2020-02-11", phone: "415-623-0975", email: "dkduario@gmail.com", location: "SF" },
    { name: "Jackson Haselnus", position: "TD", rate: 45.4545, startDate: "2018-08-10", phone: "971-998-5821", email: "jacksonhaselnus@gmail.com", location: "Oregon" },
    { name: "John Andrews", position: "TD", rate: 45.4545, startDate: "2018-10-23", phone: "408-813-8370", email: "John.C.Andrews@outlook.com", location: "San Jose" },
    { name: "Joseph Ocon", position: "TD", rate: 50.0000, startDate: "2015-09-10", phone: "925-642-4541", email: "josephocontd@gmail.com", location: "SF" },
    { name: "Mark Baggs", position: "TD", rate: 55.0000, startDate: "2016-07-27", phone: "916-718-6070", email: "baggcar@hotmail.com", location: "Sacramento" },
    { name: "Mark Erickson", position: "TD", rate: 45.0000, startDate: "2018-11-27", phone: "415-760-3929", email: "mark900ie@gmail.com", location: "Moraga" },
    { name: "Mike Fitzgerald", position: "TD", rate: 52.2727, startDate: "2016-05-17", phone: "858-449-1640", email: "mikefitz2112@gmail.com", location: "Burlingame" },
    { name: "Neill Strickland", position: "TD", rate: 50.0000, startDate: "2022-08-04", phone: "661-645-4772", email: "neillstrickland@gmail.com", location: "Sherman Oaks" },
    { name: "Scott Lawler", position: "TD", rate: 45.0000, startDate: "2019-02-28", phone: "510-301-5849", email: "lawler.scott@gmail.com", location: "Oakland" },

    // A1 positions
    { name: "Danny Contreras", position: "A1", rate: 45.4545, phone: "650-679-2097", email: "dbrt30@yahoo.com", location: "" },
    { name: "Derek Hirsch", position: "A1", rate: 50.0000, startDate: "2021-10-07", phone: "510-703-4452", email: "schmorker@gmail.com", location: "Oakland" },
    { name: "Eugene Pastor", position: "A1", rate: 36.3636, startDate: "2022-02-26", phone: "831-920-9669", email: "eugenejoshpastor@gmail.com", location: "Marina" },
    { name: "Fawzi Nijem", position: "A1", rate: 50.0000, phone: "510-333-1675", email: "fawzi.nijem@gmail.com", location: "Berkeley" },
    { name: "Garrett Knapp", position: "A1", rate: 50.0000, startDate: "2016-11-07", phone: "209-406-9334", email: "garrett.knapp@me.com", location: "Stockton" },
    { name: "Grant Goodrich", position: "A1", rate: 50.0000, startDate: "2020-01-14", phone: "650-759-0682", email: "grant.s.goodrich@gmail.com", location: "Half Moon Bay" },
    { name: "Jeremy Katz", position: "A1", rate: 50.0000, startDate: "2019-04-18", phone: "650-776-3798", email: "jeremyakatz@gmail.com", location: "Oakland" },
    { name: "John Holsinger", position: "A1", rate: 36.3636, startDate: "2022-08-03", phone: "650-464-9905", email: "johnholsinger.kxsf@gmail.com", location: "SF" },
    { name: "Marcus Buick", position: "A1", rate: 50.0000, startDate: "2016-12-02", phone: "415-577-1725", email: "marcus@marcusbuick.com", location: "Dublin" },
    { name: "Michael May", position: "A1", rate: 45.4545, startDate: "2022-08-03", phone: "510-302-8574", email: "cras.mmay@gmail.com", location: "Oakland" },
    { name: "Stephen Fisher", position: "A1", rate: 50.0000, startDate: "2016-07-27", phone: "408-380-9788", email: "stephenfisher1985@gmail.com", location: "Richmond" },
    { name: "Tom Kansora", position: "A1", rate: 50.0000, startDate: "2016-07-27", phone: "415-497-2353", email: "tom@kansora.com", location: "San Anselmo" },

    // Tape Lead positions
    { name: "Akshay Anand", position: "Tape Lead", rate: 36.3636, startDate: "2022-01-11", phone: "916-248-3914", email: "aanand0822@gmail.com", location: "Sacramento" },
    { name: "Andra Etchison", position: "Tape Lead", rate: 36.3636, startDate: "2022-08-15", phone: "661-429-5984", email: "andraetchisonjr1@gmail.com", location: "LA" },
    { name: "Avery Latorre", position: "Tape Lead", rate: 42.7273, startDate: "2019-01-10", phone: "510-691-9997", email: "latorre.avery@gmail.com", location: "Alameda" },
    { name: "Bobby Cullen", position: "Tape Lead", rate: 40.9091, startDate: "2022-12-10", phone: "916-600-0288", email: "bobbycullen@mac.com", location: "Walnut Creek" },
    { name: "Charlie Magana", position: "Tape Lead", rate: 35.0000, startDate: "2019-12-09", phone: "209-556-3360", email: "charlie.magana19@gmail.com", location: "Ceres" },
    { name: "David Hu", position: "Tape Lead", rate: 45.4545, startDate: "2021-01-16", phone: "949-394-3865", email: "hu.dave@gmail.com", location: "SF" },
    { name: "David Saunders", position: "Tape Lead", rate: 45.4545, startDate: "2017-07-28", phone: "310-529-2957", email: "dsaunders.sports@gmail.com", location: "Oakland" },
    { name: "Edwin Huttegger", position: "Tape Lead", rate: 50.0000, startDate: "2021-11-11", phone: "530-301-0386", email: "edleyphoto@yahoo.com", location: "Sacramento" },
    { name: "Erin Walker", position: "Tape Lead", rate: 31.8182, startDate: "2022-09-28", phone: "510-499-6611", email: "erintwalker1@gmail.com", location: "Oakland" },
    { name: "Jackson Haselnus", position: "Tape Lead", rate: 45.4545, startDate: "2020-12-09", phone: "971-998-5821", email: "jacksonhaselnus@gmail.com", location: "Oregon" },
    { name: "John Andrews", position: "Tape Lead", rate: 35.0000, startDate: "2018-10-23", phone: "408-813-8370", email: "John.C.Andrews@outlook.com", location: "San Jose" },
    { name: "Kendric Ganeko", position: "Tape Lead", rate: 45.4545, startDate: "2018-08-19", phone: "310-683-9225", email: "kenjrixTG@gmail.com", location: "Daly City" },
    { name: "Nate Barrack", position: "Tape Lead", rate: 50.0000, startDate: "2016-07-27", phone: "619-850-7356", email: "nbarrack@yahoo.com", location: "Berkeley" },
    { name: "Raymond Rodriguez", position: "Tape Lead", rate: 45.4545, startDate: "2016-07-27", phone: "510-501-0059", email: "raymond.stewart.rodriguez@gmail.com", location: "Alameda" },
    { name: "Scott Valor", position: "Tape Lead", rate: 40.0000, startDate: "2017-04-17", phone: "925-788-8511", email: "scottav123@yahoo.com", location: "Concord" },
    { name: "Sean Matthews", position: "Tape Lead", rate: 36.3636, startDate: "2022-08-31", phone: "415-385-3192", email: "seanmathews21@outlook.com", location: "SF" },
    { name: "Sierra Miller", position: "Tape Lead", rate: 30.0000, phone: "925-605-6317", email: "sierramcreative@gmail.com", location: "Livermore" },
    { name: "Shannon McBride", position: "Tape Lead", rate: 34.0909, startDate: "2023-01-26", phone: "707-771-0570", email: "shannon.mcbr3@gmail.com", location: "Benicia" },
    { name: "Steven Lowe", position: "Tape Lead", rate: 45.4545, startDate: "2016-10-03", phone: "209-769-2121", email: "Slowe9420@gmail.com", location: "Los Banos" },
    { name: "Taariq Johnson", position: "Tape Lead", rate: 30.0000, startDate: "2022-12-08", phone: "310-494-1498", email: "taariqj595@gmail.com", location: "San Jose" },
    { name: "Tim Mamaril", position: "Tape Lead", rate: 45.4545, startDate: "2019-01-18", phone: "415-728-4512", email: "tmamaril@gmail.com", location: "American Canyon" },
    { name: "Toly Skuratovskiv", position: "Tape Lead", rate: 45.4545, startDate: "2016-07-29", phone: "415-385-4922", email: "tolyskurat@gmail.com", location: "Oakland" },

    // Tape RO positions
    { name: "Akshay Anand", position: "Tape RO", rate: 30.0000, startDate: "2022-01-11", phone: "916-248-3914", email: "aanand0822@gmail.com", location: "Sacramento" },
    { name: "Andra Etchison", position: "Tape RO", rate: 31.8182, startDate: "2022-08-15", phone: "661-429-5984", email: "andraetchisonjr1@gmail.com", location: "LA" },
    { name: "Avery Latorre", position: "Tape RO", rate: 31.8181, startDate: "2019-01-10", phone: "510-691-9997", email: "latorre.avery@gmail.com", location: "Alameda" },
    { name: "Charlie Magana", position: "Tape RO", rate: 30.0000, startDate: "2019-12-09", phone: "209-556-3360", email: "charlie.magana19@gmail.com", location: "Ceres" },
    { name: "David Hu", position: "Tape RO", rate: 40.9091, startDate: "2021-01-16", phone: "949-394-3865", email: "hu.dave@gmail.com", location: "SF" },
    { name: "David Saunders", position: "Tape RO", rate: 30.0000, startDate: "2017-07-28", phone: "310-529-2957", email: "dsaunders.sports@gmail.com", location: "Oakland" },
    { name: "Edwin Huttegger", position: "Tape RO", rate: 31.8181, startDate: "2021-11-11", phone: "530-301-0386", email: "edleyphoto@yahoo.com", location: "Sacramento" },
    { name: "Erin Walker", position: "Tape RO", rate: 27.2727, startDate: "2022-09-28", phone: "510-499-6611", email: "erintwalker1@gmail.com", location: "Oakland" },
    { name: "Jackson Haselnus", position: "Tape RO", rate: 40.9091, startDate: "2020-12-09", phone: "971-998-5821", email: "jacksonhaselnus@gmail.com", location: "Oregon" },
    { name: "John Andrews", position: "Tape RO", rate: 30.0000, startDate: "2018-10-23", phone: "408-813-8370", email: "John.C.Andrews@outlook.com", location: "San Jose" },
    { name: "Kendric Ganeko", position: "Tape RO", rate: 31.8181, startDate: "2018-08-19", phone: "310-683-9225", email: "kenjrixTG@gmail.com", location: "Daly City" },
    { name: "Nate Barrack", position: "Tape RO", rate: 31.8182, startDate: "2016-07-27", phone: "619-850-7356", email: "nbarrack@yahoo.com", location: "Berkeley" },
    { name: "Raymond Rodriguez", position: "Tape RO", rate: 31.8182, startDate: "2016-07-27", phone: "510-501-0059", email: "raymond.stewart.rodriguez@gmail.com", location: "Alameda" },
    { name: "Scott Valor", position: "Tape RO", rate: 35.0000, startDate: "2017-04-17", phone: "925-788-8511", email: "scottav123@yahoo.com", location: "Concord" },
    { name: "Sean Matthews", position: "Tape RO", rate: 30.0000, startDate: "2022-08-31", phone: "415-385-3192", email: "seanmathews21@outlook.com", location: "SF" },
    { name: "Shannon McBride", position: "Tape RO", rate: 27.2727, startDate: "2023-01-26", phone: "707-771-0570", email: "shannon.mcbr3@gmail.com", location: "Benicia" },
    { name: "Sierra Miller", position: "Tape RO", rate: 25.0000, phone: "925-605-6317", email: "sierramcreative@gmail.com", location: "Livermore" },
    { name: "Steven Lowe", position: "Tape RO", rate: 31.8181, startDate: "2016-10-03", phone: "209-769-2121", email: "Slowe9420@gmail.com", location: "Los Banos" },
    { name: "Taariq Johnson", position: "Tape RO", rate: 25.0000, startDate: "2022-12-08", phone: "310-494-1498", email: "taariqj595@gmail.com", location: "San Jose" },
    { name: "Tim Mamaril", position: "Tape RO", rate: 36.3636, startDate: "2019-01-18", phone: "415-728-4512", email: "tmamaril@gmail.com", location: "American Canyon" },
    { name: "Toly Skuratovskiv", position: "Tape RO", rate: 31.8181, startDate: "2016-07-29", phone: "415-385-4922", email: "tolyskurat@gmail.com", location: "Oakland" },
    { name: "Yohn Hall", position: "Tape RO", rate: 25.0000, startDate: "2023-01-24", phone: "215-559-4211", email: "15yohnh@gmail.com", location: "Daly City" },

    // Font coordinator positions
    { name: "Alexis Meraz", position: "Font Coordinator", rate: 27.2727, startDate: "2019-11-15", phone: "619-519-5898", email: "alexis.meraz2014@gmail.com", location: "SF" },
    { name: "Andy Renga", position: "Font Coordinator", rate: 40.9091, startDate: "2017-03-27", phone: "212-960-8788", email: "renganorcal@gmail.com", location: "San Rafael" },
    { name: "Ari Kaye", position: "Font Coordinator", rate: 27.2727, startDate: "2016-07-28", phone: "650-804-2253", email: "akaye_f@pac-12.org", location: "Palo Alto" },
    { name: "Brandon Aninipot", position: "Font Coordinator", rate: 25.0000, phone: "415-630-3801", email: "b.aninipot15@gmail.com", location: "Richmond" },
    { name: "DSM", position: "Font Coordinator", rate: 27.2727, startDate: "2016-07-29", phone: "805-947-8950", email: "dsaldana-montgomery_f@pac-12.org", location: "Oakland" },
    { name: "Derrick Duario", position: "Font Coordinator", rate: 27.2727, startDate: "2020-02-11", phone: "415-623-0975", email: "dkduario@gmail.com", location: "SF" },
    { name: "Erin Walker", position: "Font Coordinator", rate: 25.0000, startDate: "2022-09-28", phone: "510-499-6611", email: "erintwalker1@gmail.com", location: "Oakland" },
    { name: "Eugene Pastor", position: "Font Coordinator", rate: 25.0000, startDate: "2022-02-26", phone: "831-920-9669", email: "eugenejoshpastor@gmail.com", location: "Marina" },
    { name: "Jacob Violante", position: "Font Coordinator", rate: 27.2727, startDate: "2017-01-11", phone: "408-509-4933", email: "jviolante91@gmail.com", location: "SF" },
    { name: "Jerry Hanlon", position: "Font Coordinator", rate: 35.0000, startDate: "2016-11-10", phone: "925-895-5913", email: "hanlon.jerry@gmail.com", location: "Discovery Bay" },
    { name: "Joel Farbstein", position: "Font Coordinator", rate: 36.3636, startDate: "2015-07-29", phone: "650-728-5635", email: "jfarbstein@pac-12.org", location: "Montera" },
    { name: "John Balwiggire", position: "Font Coordinator", rate: 25.0000, startDate: "2022-09-22", phone: "951-306-5842", email: "jbalwigaire@gmail.com", location: "Campbell" },
    { name: "John Carungay", position: "Font Coordinator", rate: 27.2727, startDate: "2019-10-21", phone: "415-609-3320", email: "Johncarungay@ymail.com", location: "San Mateo" },
    { name: "John Holsinger", position: "Font Coordinator", rate: 25.0000, startDate: "2022-08-03", phone: "650-464-9905", email: "johnholsinger.kxsf@gmail.com", location: "SF" },
    { name: "Mike Rosenthal", position: "Font Coordinator", rate: 25.0000, startDate: "2018-08-20", phone: "415-810-7012", email: "mrrosey@aol.com", location: "SF" },
    { name: "Nick Liverani", position: "Font Coordinator", rate: 27.2727, startDate: "2022-08-03", phone: "201-468-7153", email: "nickliverani44@gmail.com", location: "SF" },
    { name: "Robbie Kistner", position: "Font Coordinator", rate: 36.3636, startDate: "2016-10-17", phone: "925-683-4498", email: "kistnerrob@yahoo.com", location: "Walnut Creek" },
    { name: "Sean Serrano", position: "Font Coordinator", rate: 25.0000, startDate: "2019-08-18", phone: "916-952-9216", email: "sean.serranoo@gmail.com", location: "Santa Clara" },
    { name: "Shane Swinnerton", position: "Font Coordinator", rate: 27.2727, startDate: "2020-11-02", phone: "925-915-9011", email: "sswinnerton_f@pac-12.org", location: "Danville" },
    { name: "Yohn Hall", position: "Font Coordinator", rate: 25.0000, startDate: "2023-01-24", phone: "215-559-4211", email: "15yohnh@gmail.com", location: "Daly City" },
    { name: "Zachary McKrell", position: "Font Coordinator", rate: 25.0000, startDate: "2022-08-18", phone: "707-685-6818", email: "zmckrell@gmail.com", location: "Walnut Creek" },

    // Xpression positions
    { name: "Andy Renga", position: "Xpression", rate: 45.0000, startDate: "2017-03-27", phone: "212-960-8788", email: "renganorcal@gmail.com", location: "San Rafael" },
    { name: "David Hasselfeld", position: "Xpression", rate: 35.0000, startDate: "2016-07-27", phone: "925-917-6617", email: "davwhass@gmail.com", location: "Martinez" },
    { name: "DSM", position: "Xpression", rate: 36.3636, startDate: "2022-01-29", phone: "805-947-8950", email: "dsaldana-montgomery_f@pac-12.org", location: "Oakland" },
    { name: "Derrick Duario", position: "Xpression", rate: 33.0000, startDate: "2020-02-11", phone: "415-623-0975", email: "dkduario@gmail.com", location: "SF" },
    { name: "Erin Walker", position: "Xpression", rate: 31.8182, startDate: "2022-09-25", phone: "510-499-6611", email: "erintwalker1@gmail.com", location: "Oakland" },
    { name: "Jacob Violante", position: "Xpression", rate: 38.6363, startDate: "2017-01-11", phone: "408-509-4933", email: "jviolante91@gmail.com", location: "SF" },
    { name: "Jerry Hanlon", position: "Xpression", rate: 45.4545, startDate: "2016-11-10", phone: "925-895-5913", email: "hanlon.jerry@gmail.com", location: "Discovery Bay" },
    { name: "John Carungay", position: "Xpression", rate: 35.0000, startDate: "2019-10-21", phone: "415-609-3320", email: "Johncarungay@ymail.com", location: "San Mateo" },
    { name: "Nick Liverani", position: "Xpression", rate: 38.6364, startDate: "2022-08-03", phone: "201-468-7153", email: "nickliverani44@gmail.com", location: "SF" },
    { name: "Terre Harrison", position: "Xpression", rate: 50.0000, startDate: "2021-11-11", phone: "415-722-0367", email: "terreh1@yahoo.com", location: "Richmond" },

    // Bug positions
    { name: "Andy Renga", position: "Bug", rate: 30.0000, phone: "212-960-8788", email: "renganorcal@gmail.com", location: "San Rafael" },
    { name: "DSM", position: "Bug", rate: 27.2727, startDate: "2016-07-29", phone: "805-947-8950", email: "dsaldana-montgomery_f@pac-12.org", location: "Oakland" },
    { name: "Derrick Duario", position: "Bug", rate: 30.9090, startDate: "2020-02-11", phone: "415-623-0975", email: "dkduario@gmail.com", location: "SF" },
    { name: "Erin Walker", position: "Bug", rate: 27.2727, startDate: "2022-09-28", phone: "510-499-6611", email: "erintwalker1@gmail.com", location: "Oakland" },
    { name: "Eugene Pastor", position: "Bug", rate: 27.2727, startDate: "2022-02-26", phone: "831-920-9669", email: "eugenejoshpastor@gmail.com", location: "Marina" },
    { name: "Jacob Violante", position: "Bug", rate: 30.0000, startDate: "2017-01-11", phone: "408-509-4933", email: "jviolante91@gmail.com", location: "SF" },
    { name: "Jerry Hanlon", position: "Bug", rate: 35.0000, startDate: "2016-11-10", phone: "925-895-5913", email: "hanlon.jerry@gmail.com", location: "Discovery Bay" },
    { name: "John Balwiggire", position: "Bug", rate: 30.0000, startDate: "2022-09-22", phone: "951-306-5842", email: "jbalwigaire@gmail.com", location: "Campbell" },
    { name: "John Carungay", position: "Bug", rate: 30.0000, startDate: "2019-10-21", phone: "415-609-3320", email: "Johncarungay@ymail.com", location: "San Mateo" },
    { name: "John Holsinger", position: "Bug", rate: 27.2727, startDate: "2022-08-03", phone: "650-464-9905", email: "johnholsinger.kxsf@gmail.com", location: "SF" },
    { name: "Matt Carrera", position: "Bug", rate: 30.0000, startDate: "2019-03-07", phone: "209-627-6512", email: "mcarrera97@yahoo.com", location: "Tracy" },
    { name: "Nick Liverani", position: "Bug", rate: 30.0000, startDate: "2022-08-03", phone: "201-468-7153", email: "nickliverani44@gmail.com", location: "SF" },
    { name: "Rebecca King", position: "Bug", rate: 28.0000, startDate: "2018-02-09", phone: "925-457-4700", email: "jhawksbking@yahoo.com", location: "Walnut Creek" },
    { name: "Sean Serrano", position: "Bug", rate: 25.0000, startDate: "2019-08-18", phone: "916-952-9216", email: "sean.serranoo@gmail.com", location: "Santa Clara" },
    { name: "Yohn Hall", position: "Bug", rate: 25.0000, startDate: "2023-01-24", phone: "215-559-4211", email: "15yohnh@gmail.com", location: "Daly City" },
    { name: "Zachary McKrell", position: "Bug", rate: 30.0000, startDate: "2022-08-18", phone: "707-685-6818", email: "zmckrell@gmail.com", location: "Walnut Creek" },

    // All in one positions
    { name: "Andy Renga", position: "All In One", rate: 45.0000, startDate: "2017-03-27", phone: "212-960-8788", email: "renganorcal@gmail.com", location: "San Rafael" },
    { name: "DSM", position: "All In One", rate: 36.3636, startDate: "2016-07-29", phone: "805-947-8950", email: "dsaldana-montgomery_f@pac-12.org", location: "Oakland" },
    { name: "Derrick Duario", position: "All In One", rate: 31.8182, startDate: "2020-02-11", phone: "415-623-0975", email: "dkduario@gmail.com", location: "SF" },
    { name: "Erin Walker", position: "All In One", rate: 27.2727, startDate: "2022-09-28", phone: "510-499-6611", email: "erintwalker1@gmail.com", location: "Oakland" },
    { name: "Eugene Pastor", position: "All In One", rate: 27.2727, startDate: "2022-02-26", phone: "831-920-9669", email: "eugenejoshpastor@gmail.com", location: "Marina" },
    { name: "Jacob Violante", position: "All In One", rate: 35.0000, startDate: "2017-01-11", phone: "408-509-4933", email: "jviolante91@gmail.com", location: "SF" },
    { name: "Jerry Hanlon", position: "All In One", rate: 36.3636, startDate: "2016-11-10", phone: "925-895-5913", email: "hanlon.jerry@gmail.com", location: "Discovery Bay" },
    { name: "John Balwiggire", position: "All In One", rate: 31.8182, startDate: "2022-09-22", phone: "951-306-5842", email: "jbalwigaire@gmail.com", location: "Campbell" },
    { name: "John Carungay", position: "All In One", rate: 36.3636, startDate: "2019-10-21", phone: "415-609-3320", email: "Johncarungay@ymail.com", location: "San Mateo" },
    { name: "Nick Liverani", position: "All In One", rate: 31.8182, startDate: "2022-08-03", phone: "201-468-7153", email: "nickliverani44@gmail.com", location: "SF" },
    { name: "Rebecca King", position: "All In One", rate: 30.0000, startDate: "2018-02-09", phone: "925-457-4700", email: "jhawksbking@yahoo.com", location: "Walnut Creek" },
    { name: "Sean Serrano", position: "All In One", rate: 30.0000, startDate: "2019-08-18", phone: "916-952-9216", email: "sean.serranoo@gmail.com", location: "Santa Clara" },
    { name: "Zachary McKrell", position: "All In One", rate: 31.8182, startDate: "2022-08-18", phone: "707-685-6818", email: "zmckrell@gmail.com", location: "Walnut Creek" },

    // A2 positions
    { name: "Brandon Aninipot", position: "A2", rate: 20.0000, startDate: "2022-11-26", phone: "415-630-3801", email: "b.aninipot15@gmail.com", location: "Richmond" },
    { name: "Eugene Pastor", position: "A2", rate: 20.0000, startDate: "2022-02-26", phone: "831-920-9669", email: "eugenejoshpastor@gmail.com", location: "Marina" },
    { name: "Grant Goodrich", position: "A2", rate: 25.0000, startDate: "2020-01-14", phone: "650-759-0682", email: "grant.s.goodrich@gmail.com", location: "Half Moon Bay" },
    { name: "Jacob Violante", position: "A2", rate: 25.0000, startDate: "2017-01-11", phone: "408-509-4933", email: "jviolante91@gmail.com", location: "SF" },
    { name: "John Holsinger", position: "A2", rate: 30.0000, startDate: "2022-08-03", phone: "650-464-9905", email: "johnholsinger.kxsf@gmail.com", location: "SF" },

    // V1 positions
    { name: "Taariq Johnson", position: "V1", rate: 20.0000, startDate: "2022-12-08", phone: "310-494-1498", email: "taariqj595@gmail.com", location: "San Jose" },
    { name: "Tobi Wettstein", position: "V1", rate: 35.0000, startDate: "2016-07-27", phone: "415-533-5919", email: "tobias_wettstein@hotmail.com", location: "SF" },
    { name: "Yohn Hall", position: "V1", rate: 20.0000, startDate: "2023-01-24", phone: "215-559-4211", email: "15yohnh@gmail.com", location: "Daly City" },

    // Jib positions
    { name: "Aaron Kelly", position: "Jib Op", rate: 40.0000, startDate: "2017-08-23", phone: "510-326-8747", email: "aaron@akfilms.tv", location: "Concord" },
    { name: "Eugene Pastor", position: "Jib Op", rate: 25.0000, startDate: "2022-02-26", phone: "831-920-9669", email: "eugenejoshpastor@gmail.com", location: "Marina" },
    { name: "Evan Lanam", position: "Jib Op", rate: 40.0000, startDate: "2016-08-01", phone: "650-703-6379", email: "evanjlanam@gmail.com", location: "El Sobrante" },
    { name: "Jennifer Clark", position: "Jib Op", rate: 35.0000, startDate: "2020-11-11", phone: "415-939-0234", email: "jennieclark@earthlink.net", location: "SF" },
    { name: "John Balwiggire", position: "Jib Op", rate: 25.0000, startDate: "2022-09-22", phone: "951-306-5842", email: "jbalwigaire@gmail.com", location: "Campbell" },
    { name: "Taariq Johnson", position: "Jib Op", rate: 25.0000, startDate: "2022-12-08", phone: "310-494-1498", email: "taariqj595@gmail.com", location: "San Jose" },
    { name: "Tobi Wettstein", position: "Jib Op", rate: 40.0000, startDate: "2016-07-27", phone: "415-533-5919", email: "tobias_wettstein@hotmail.com", location: "SF" },

    // Hard camera positions
    { name: "Aaron Kelly", position: "Hard Camera", rate: 22.0000, startDate: "2017-08-23", phone: "510-326-8747", email: "aaron@akfilms.tv", location: "Concord" },
    { name: "Alexis Meraz", position: "Hard Camera", rate: 17.0000, startDate: "2019-11-15", phone: "619-519-5898", email: "alexis.meraz2014@gmail.com", location: "SF" },
    { name: "Brandon Aninipot", position: "Hard Camera", rate: 20.0000, startDate: "2022-11-26", phone: "415-630-3801", email: "b.aninipot15@gmail.com", location: "Richmond" },
    { name: "Erin Walker", position: "Hard Camera", rate: 20.0000, startDate: "2022-09-28", phone: "510-499-6611", email: "erintwalker1@gmail.com", location: "Oakland" },
    { name: "Eugene Pastor", position: "Hard Camera", rate: 20.0000, startDate: "2022-02-26", phone: "831-920-9669", email: "eugenejoshpastor@gmail.com", location: "Marina" },
    { name: "Evan Lanam", position: "Hard Camera", rate: 20.0000, startDate: "2016-08-01", phone: "650-703-6379", email: "evanjlanam@gmail.com", location: "El Sobrante" },
    { name: "Jacob Violante", position: "Hard Camera", rate: 20.0000, startDate: "2017-01-11", phone: "408-509-4933", email: "jviolante91@gmail.com", location: "SF" },
    { name: "John Balwiggire", position: "Hard Camera", rate: 20.0000, startDate: "2022-09-22", phone: "951-306-5842", email: "jbalwigaire@gmail.com", location: "Campbell" },
    { name: "Kendric Ganeko", position: "Hard Camera", rate: 20.0000, startDate: "2018-08-19", phone: "310-683-9225", email: "kenjrixTG@gmail.com", location: "Daly City" },
    { name: "Sean Serrano", position: "Hard Camera", rate: 20.0000, startDate: "2019-08-18", phone: "916-952-9216", email: "sean.serranoo@gmail.com", location: "Santa Clara" },
    { name: "Taariq Johnson", position: "Hard Camera", rate: 20.0000, startDate: "2022-12-08", phone: "310-494-1498", email: "taariqj595@gmail.com", location: "San Jose" },
    { name: "Tobi Wettstein", position: "Hard Camera", rate: 22.0000, startDate: "2016-07-27", phone: "415-533-5919", email: "tobias_wettstein@hotmail.com", location: "SF" },
    { name: "Yohn Hall", position: "Hard Camera", rate: 20.0000, startDate: "2023-01-24", phone: "215-559-4211", email: "15yohnh@gmail.com", location: "Daly City" },
];

// Position groups and positions configuration
const positionConfig = {
    "Technical": {
        color: "#8B5CF6",
        positions: ["TD"]
    },
    "Audio": {
        color: "#22C55E",
        positions: ["A1", "A2"]
    },
    "Video": {
        color: "#3B82F6",
        positions: ["V1", "V2"]
    },
    "Replay": {
        color: "#F59E0B",
        positions: ["Tape Lead", "Tape RO"]
    },
    "Graphics": {
        color: "#EC4899",
        positions: ["Font Coordinator", "Xpression", "Bug", "All In One"]
    },
    "Camera": {
        color: "#06B6D4",
        positions: ["Jib Op", "Hard Camera"]
    }
};

async function runImport() {
    const client = await pool.connect();

    try {
        console.log('Starting employee import...\n');
        await client.query('BEGIN');

        // Step 1: Create/update position groups
        console.log('Step 1: Creating position groups...');
        const groupIds = {};
        for (const [groupName, config] of Object.entries(positionConfig)) {
            const result = await client.query(`
                INSERT INTO position_groups (name, color, display_order)
                VALUES ($1, $2, $3)
                ON CONFLICT (name) DO UPDATE SET color = $2
                RETURNING id
            `, [groupName, config.color, Object.keys(positionConfig).indexOf(groupName) + 1]);
            groupIds[groupName] = result.rows[0].id;
            console.log(`  ✓ ${groupName} (ID: ${groupIds[groupName]})`);
        }

        // Step 2: Create positions
        console.log('\nStep 2: Creating positions...');
        const positionIds = {};
        for (const [groupName, config] of Object.entries(positionConfig)) {
            for (const posName of config.positions) {
                // Get average rate for this position from employee data
                const ratesForPosition = employeeData
                    .filter(e => e.position === posName)
                    .map(e => e.rate)
                    .filter(r => r);
                const avgRate = ratesForPosition.length > 0
                    ? ratesForPosition.reduce((a, b) => a + b, 0) / ratesForPosition.length
                    : 35.00;

                const result = await client.query(`
                    INSERT INTO positions (name, abbreviation, position_group_id, hourly_rate, description)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (name, position_group_id) DO UPDATE SET hourly_rate = $4
                    RETURNING id
                `, [posName, posName.substring(0, 10), groupIds[groupName], avgRate.toFixed(2), `${posName} position`]);
                positionIds[posName] = result.rows[0].id;
                console.log(`  ✓ ${posName} -> ${groupName} (avg rate: $${avgRate.toFixed(2)})`);
            }
        }

        // Step 3: Create unique staff resources
        console.log('\nStep 3: Creating staff resources...');
        const uniqueStaff = {};
        for (const emp of employeeData) {
            if (!uniqueStaff[emp.email]) {
                uniqueStaff[emp.email] = {
                    name: emp.name,
                    email: emp.email,
                    phone: emp.phone,
                    location: emp.location,
                    startDate: emp.startDate
                };
            }
        }

        const resourceIds = {};
        for (const [email, staff] of Object.entries(uniqueStaff)) {
            // Check if resource already exists
            let result = await client.query('SELECT id FROM resources WHERE description LIKE $1', [`%${email}%`]);

            if (result.rows.length === 0) {
                result = await client.query(`
                    INSERT INTO resources (name, type, description, color, status)
                    VALUES ($1, 'STAFF', $2, '#3B82F6', 'ACTIVE')
                    RETURNING id
                `, [
                    staff.name,
                    `Email: ${email}\nPhone: ${staff.phone || 'N/A'}\nLocation: ${staff.location || 'N/A'}\nStart Date: ${staff.startDate || 'N/A'}`
                ]);
                console.log(`  ✓ Created: ${staff.name}`);
            } else {
                console.log(`  ⊘ Exists: ${staff.name}`);
            }
            resourceIds[email] = result.rows[0].id;
        }

        // Step 4: Link staff to positions with custom rates
        console.log('\nStep 4: Linking staff to positions...');
        let linkCount = 0;
        for (const emp of employeeData) {
            const resourceId = resourceIds[emp.email];
            const positionId = positionIds[emp.position];

            if (resourceId && positionId) {
                try {
                    await client.query(`
                        INSERT INTO resource_positions (resource_id, position_id, custom_hourly_rate)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (resource_id, position_id) DO UPDATE SET custom_hourly_rate = $3
                    `, [resourceId, positionId, emp.rate || null]);
                    linkCount++;
                } catch (err) {
                    console.log(`  ⚠ Error linking ${emp.name} to ${emp.position}: ${err.message}`);
                }
            }
        }
        console.log(`  ✓ Created ${linkCount} position qualifications`);

        await client.query('COMMIT');

        // Summary
        console.log('\n✅ Import completed successfully!\n');

        const staffCount = await client.query('SELECT COUNT(*) FROM resources WHERE type = $1', ['STAFF']);
        const posCount = await client.query('SELECT COUNT(*) FROM positions');
        const qualCount = await client.query('SELECT COUNT(*) FROM resource_positions');

        console.log('Summary:');
        console.log(`  Staff resources: ${staffCount.rows[0].count}`);
        console.log(`  Positions: ${posCount.rows[0].count}`);
        console.log(`  Position qualifications: ${qualCount.rows[0].count}`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('\n❌ Import failed:', err.message);
        console.error(err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runImport();
