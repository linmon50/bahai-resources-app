import pg from 'pg';
import fs from 'fs/promises';

const { Client } = pg;

// Use the connection string provided by the user, reformatted for the AWS pooler
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function fetchSchemaAndRLS() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false } // Required for Supabase connections
    });

    try {
        await client.connect();
        console.log('Connected to database successfully.');

        let outputDoc = '# Supabase Live Schema & RLS Policies\n\n';
        outputDoc += `*Generated at: ${new Date().toISOString()}*\n\n`;

        // 1. Fetch Tables and Columns
        outputDoc += '## Tables\n\n';
        const tablesRes = await client.query(`
      SELECT 
        t.table_name,
        c.column_name,
        c.data_type,
        c.column_default,
        c.is_nullable
      FROM information_schema.tables t
      JOIN information_schema.columns c ON t.table_name = c.table_name
      WHERE t.table_schema = 'public'
      ORDER BY t.table_name, c.ordinal_position;
    `);

        let currentTable = '';
        for (const row of tablesRes.rows) {
            if (row.table_name !== currentTable) {
                if (currentTable !== '') outputDoc += '\n';
                currentTable = row.table_name;
                outputDoc += `### \`${currentTable}\`\n`;
            }
            const isReq = row.is_nullable === 'NO' ? 'required' : 'optional';
            const def = row.column_default ? `(default: ${row.column_default})` : '';
            outputDoc += `- \`${row.column_name}\` (${row.data_type}) - *${isReq}* ${def}\n`;
        }

        // 2. Fetch RLS Policies
        outputDoc += '\n## RLS Policies\n\n';
        const rlsRes = await client.query(`
      SELECT 
        schemaname, 
        tablename, 
        policyname, 
        permissive, 
        roles, 
        cmd, 
        qual, 
        with_check 
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `);

        for (const row of rlsRes.rows) {
            outputDoc += `### Table: \`${row.tablename}\` | Policy: "${row.policyname}"\n`;
            outputDoc += `- **Command:** \`${row.cmd}\`\n`;
            outputDoc += `- **Roles:** \`${row.roles}\`\n`;
            if (row.qual) outputDoc += `- **USING expression:**\n  \`\`\`sql\n  ${row.qual}\n  \`\`\`\n`;
            if (row.with_check) outputDoc += `- **WITH CHECK expression:**\n  \`\`\`sql\n  ${row.with_check}\n  \`\`\`\n`;
            outputDoc += '\n';
        }

        // Write to a local file
        const filePath = 'live_supabase_schema.md';
        await fs.writeFile(filePath, outputDoc);
        console.log(`\n✅ Schema and policies successfully written to ${filePath}`);

    } catch (err) {
        console.error('Error fetching schema:', err);
    } finally {
        await client.end();
    }
}

fetchSchemaAndRLS();
