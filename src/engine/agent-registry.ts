import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { v4 as uuid } from 'uuid';
import type { ArcDatabase } from '../db/database.js';
import type { AgentDef, AgentYaml } from '../types.js';

export class AgentRegistry {
  private db: ArcDatabase;
  private agentsDir: string;

  constructor(db: ArcDatabase, agentsDir: string) {
    this.db = db;
    this.agentsDir = agentsDir;
  }

  /** Load all YAML agent definitions from disk → upsert into DB */
  loadAll(): number {
    if (!existsSync(this.agentsDir)) return 0;

    let count = 0;
    const dirs = readdirSync(this.agentsDir).filter(name => {
      const full = join(this.agentsDir, name);
      return statSync(full).isDirectory() && !name.startsWith('.');
    });

    for (const dirName of dirs) {
      const yamlPath = join(this.agentsDir, dirName, 'agent.yaml');
      if (!existsSync(yamlPath)) continue;

      try {
        const raw = readFileSync(yamlPath, 'utf-8');
        const def = yaml.load(raw) as AgentYaml;
        const now = Date.now();

        const existing = this.db.getAgent(dirName);
        this.db.upsertAgent({
          id: dirName,
          name: def.name || dirName,
          description: def.description || '',
          systemPrompt: def.system_prompt || '',
          model: def.model,
          maxTurns: def.max_turns,
          allowedTools: def.allowed_tools,
          workingDir: def.working_dir,
          createdAt: existing?.createdAt || now,
          updatedAt: now,
        });
        count++;
      } catch (err) {
        console.error(`Failed to load agent ${dirName}:`, err);
      }
    }

    console.log(`Loaded ${count} agents from ${this.agentsDir}`);
    return count;
  }

  get(id: string): AgentDef | undefined {
    return this.db.getAgent(id);
  }

  list(): AgentDef[] {
    return this.db.listAgents();
  }

  create(data: Omit<AgentDef, 'id' | 'createdAt' | 'updatedAt'>): AgentDef {
    const now = Date.now();
    const agent: AgentDef = {
      ...data,
      id: data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      createdAt: now,
      updatedAt: now,
    };
    this.db.upsertAgent(agent);
    return agent;
  }

  update(id: string, updates: Partial<Omit<AgentDef, 'id' | 'createdAt'>>): AgentDef | undefined {
    const existing = this.db.getAgent(id);
    if (!existing) return undefined;

    const updated: AgentDef = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: Date.now(),
    };
    this.db.upsertAgent(updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.db.deleteAgent(id);
  }
}
