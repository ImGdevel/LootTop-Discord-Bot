ALTER TABLE guild_settings ADD COLUMN week_number_start INTEGER DEFAULT 1;
ALTER TABLE weekly_goal_cycles ADD COLUMN week_number INTEGER DEFAULT NULL;
