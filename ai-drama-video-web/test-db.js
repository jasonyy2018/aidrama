const postgres = require('postgres');

const sql = postgres('postgresql://postgres:123456@localhost:5432/aidrama');

async function main() {
  try {
    console.log("Querying database tables...");
    
    // Check columns of afv_script_episode
    const cols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'afv_script_episode';
    `;
    console.log("afv_script_episode Columns:", cols.map(c => `${c.column_name}: ${c.data_type}`));
    
    // Let's query scriptEpisodes for id 17
    const episodes = await sql`
      SELECT * FROM afv_script_episode WHERE script_id = 17;
    `;
    console.log("Episodes for script 17 (raw):", episodes);
  } catch (err) {
    console.error("Database query failed:", err);
  } finally {
    await sql.end();
  }
}

main();
