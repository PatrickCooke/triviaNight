import db from './db.js';

function insertQuestions(setId: any, questions: any[]) {
    for (const q of questions) {
        db.prepare('INSERT INTO questions (set_id, type, prompt, content) VALUES (?, ?, ?, ?)')
            .run(setId, q.type, q.prompt, JSON.stringify(q.content));
    }
}

async function seed() {
    console.log('Seeding All Data...');
    
    // Create Event
    const eventId = db.prepare('INSERT INTO events (title, date, location) VALUES (?, ?, ?)')
        .run('Prime Winter Trivia (Full)', '2026-01-09T19:00:00', 'Community Center').lastInsertRowid;

    // Round 1
    console.log('Round 1...');
    const s1 = db.prepare('INSERT INTO sets (name, description) VALUES (?, ?)').run('Round 1: History/Geography', '').lastInsertRowid;
    db.prepare('INSERT INTO event_sets (event_id, set_id) VALUES (?, ?)').run(eventId, s1);
    insertQuestions(s1, [
        { type: 'multi_part', prompt: 'Cairo/Giza pyramids', content: { answers: ['3'] } },
        { type: 'multi_part', prompt: 'Statue of Liberty gift/date', content: { answers: ['France', '1886'] } },
        { type: 'multi_part', prompt: 'Columbus year/nation', content: { answers: ['1492', 'Spain'] } },
        { type: 'multi_part', prompt: 'Bermuda Triangle body of water', content: { answers: ['Atlantic Ocean'] } },
        { type: 'multi_part', prompt: 'Starbucks outside NA', content: { answers: ['Japan', '1996'] } },
        { type: 'multi_part', prompt: 'Smallest US state', content: { answers: ['Rhode Island', '1214'] } },
        { type: 'multi_part', prompt: 'Colosseum city/emperor', content: { answers: ['Rome', 'Vespasian', 'Titus'] } },
        { type: 'multi_part', prompt: 'Flag iterations', content: { answers: ['27', '1960'] } },
        { type: 'matching', prompt: 'Historical Documents Sequence', content: { pairs: [{left:'1', right:'Magna Carta'}, {left:'2', right:'Dec of Ind'}] } }
    ]);

    // Round 2
    console.log('Round 2...');
    const s2 = db.prepare('INSERT INTO sets (name, description) VALUES (?, ?)').run('Round 2: Bible', '').lastInsertRowid;
    db.prepare('INSERT INTO event_sets (event_id, set_id) VALUES (?, ?)').run(eventId, s2);
    insertQuestions(s2, [
        { type: 'multi_part', prompt: 'Adam/Eve Garden/Plant', content: { answers: ['Eden', 'Knowledge'] } },
        { type: 'multi_part', prompt: 'Shortest verse', content: { answers: ['John 11:35'] } },
        { type: 'multi_part', prompt: 'NT Books', content: { answers: ['27'] } },
        { type: 'multi_part', prompt: 'Ark builder/wood', content: { answers: ['Noah', 'Gopher'] } },
        { type: 'multi_part', prompt: 'Swallowed by fish', content: { answers: ['Jonah', 'Joppa'] } },
        { type: 'multi_part', prompt: 'Moses Mountain', content: { answers: ['Sinai'] } },
        { type: 'multi_part', prompt: 'Flood duration', content: { answers: ['40', '600'] } },
        { type: 'multi_part', prompt: 'Peters 3 colleagues', content: { answers: ['Andrew', 'James', 'John'] } },
        { type: 'matching', prompt: 'Judges Sequence', content: { pairs: [{left:'1', right:'Ehud'}, {left:'2', right:'Deborah'}] } }
    ]);

    // Round 3
    console.log('Round 3...');
    const s3 = db.prepare('INSERT INTO sets (name, description) VALUES (?, ?)').run('Round 3: Pop Culture', '').lastInsertRowid;
    db.prepare('INSERT INTO event_sets (event_id, set_id) VALUES (?, ?)').run(eventId, s3);
    insertQuestions(s3, [
        { type: 'multi_part', prompt: 'Star Wars 1977', content: { answers: ['4', 'A New Hope'] } },
        { type: 'multi_part', prompt: 'Avengers founders', content: { answers: ['Iron Man', 'Hulk', 'Thor', 'Ant man', 'Wasp'] } },
        { type: 'multi_part', prompt: 'Wii Release/Sports', content: { answers: ['2006', 'Tennis', 'Golf', 'Bowling', 'Boxing', 'Baseball'] } },
        { type: 'multi_part', prompt: 'iPhone/Android year', content: { answers: ['2007', '2008'] } },
        { type: 'multi_part', prompt: 'Survivor seasons/contestants', content: { answers: ['50', '751'] } },
        { type: 'multi_part', prompt: 'Eras Tour shows/cities', content: { answers: ['149', '51'] } },
        { type: 'multi_part', prompt: 'Titanic movie/weeks', content: { answers: ['Titanic', '15'] } },
        { type: 'multi_part', prompt: 'Spongebob pineapple/movies', content: { answers: ['Spongebob', '4'] } },
        { type: 'matching', prompt: 'Bond Actors Sequence', content: { pairs: [{left:'1', right:'Connery'}, {left:'2', right:'Lazenby'}] } }
    ]);

    // Round 4
    console.log('Round 4...');
    const s4 = db.prepare('INSERT INTO sets (name, description) VALUES (?, ?)').run('Round 4: Science', '').lastInsertRowid;
    db.prepare('INSERT INTO event_sets (event_id, set_id) VALUES (?, ?)').run(eventId, s4);
    insertQuestions(s4, [
        { type: 'multi_part', prompt: 'Rare blood type', content: { answers: ['AB-Negative'] } },
        { type: 'multi_part', prompt: 'Marie Curie', content: { answers: ['Marie Curie', '1903'] } },
        { type: 'multi_part', prompt: 'Photosynthesis', content: { answers: ['Photosynthesis', 'Chlorophyll'] } },
        { type: 'multi_part', prompt: 'Earthquakes/Richter', content: { answers: ['Earthquakes', '9.5'] } },
        { type: 'multi_part', prompt: 'Largest organ', content: { answers: ['Skin'] } },
        { type: 'multi_part', prompt: 'Octopus hearts/blood', content: { answers: ['3', 'blue'] } },
        { type: 'multi_part', prompt: 'Planet moons', content: { answers: ['Saturn', 'Mercury', 'Venus'] } },
        { type: 'multi_part', prompt: 'Apollo 11', content: { answers: ['Apollo 11', '6'] } },
        { type: 'matching', prompt: 'Animal Groups', content: { pairs: [{left:'Crow', right:'Murder'}, {left:'Ferret', right:'Business'}] } }
    ]);

    // Speed Round
    console.log('Speed Round...');
    const s5 = db.prepare('INSERT INTO sets (name, description) VALUES (?, ?)').run('Speed Round', '').lastInsertRowid;
    db.prepare('INSERT INTO event_sets (event_id, set_id) VALUES (?, ?)').run(eventId, s5);
    const mc = [
        ['Mountain', 'Everest', ['Doom', 'Brighton', 'Rainier']],
        ['Hummus', 'Chickpeas', ['humms', 'avocado', 'watermelon']],
        ['Smallest country', 'Vatican City', ['Russia', 'Chile', 'Cambodia']],
        ['Eiffel Tower', 'Paris', ['El Dorado', 'Rome', 'London']],
        ['States', '50', ['42', '13', '3']],
        ['Continents', '7', ['2', '4', '9']],
        ['Largest State', 'Alaska', ['California', 'Rhode Island', 'Oregon']],
        ['Largest Mammal', 'Blue Whale', ['Rhinoceros', 'Hippo', 'Slug']],
        ['Largest ocean', 'Pacific', ['Lake Superior', 'Indian', 'Arctic']],
        ['Guacamole', 'Avocado', ['Moles', 'Lime', 'Salt']],
        ['Leap year', '366', ['14', '370', 'All']],
        ['Emeralds', 'Green', ['Blue', 'Yellow', 'Red']],
        ['Spider legs', '8', ['2', '4', '13']],
        ['Largest planet', 'Jupiter', ['Earth', 'Neptune', 'Mars']],
        ['Triangle sides', '3', ['4', '2', '8']],
        ['Frozen water', 'Ice', ['Cold Water', 'Slurpee', 'Chilly']],
        ['Wool source', 'Sheep', ['Spiders', 'Cows', 'Pigs']],
        ['Hours', '24', ['12', '30', '2']],
        ['Best friend', 'Dog', ['Fish', 'Cat', 'Pigs']],
        ['Sky', 'Blue', ['Green', 'Yellow', 'Red']]
    ];
    insertQuestions(s5, mc.map(i => ({ type: 'multiple_choice', prompt: i[0], content: { correct: i[1], distractors: i[2] } })));

    console.log('Seeding Success!');
}

seed().catch(e => console.error('Seed Failed:', e));
