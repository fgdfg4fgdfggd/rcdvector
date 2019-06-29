
import * as fs from "fs";
import * as Path from "path";

import {ICommand} from "./command/command";
import {Globals} from "./globals";
import {IEvent} from "./event/event";

export interface IConfig {
    token: string;
    databaseHost: string;
    databaseUser: string;
    databasePassword: string;
    defaultPrefix: string;
}

export class Bootstrapper {

    private async registerCommands(): Promise<void> {
        try {
            await Globals.loggerInstance.pending("Running registerCommands();");
            await fs.readdir(Path.resolve(__dirname, "command", "impl"), async (error, files) => {
                for (const command of files) {
                    const requiredCommand = require(Path.resolve(__dirname, "command", "impl", command)).default;
                    const commandClass = new requiredCommand() as ICommand;
                    await Globals.commands.push(commandClass);
                    await Globals.loggerInstance.success(`Command ${command} loaded.`);
                }
                await Globals.loggerInstance.complete("registerCommands(); completed.")
            });
        } catch (error) {
            await Globals.loggerInstance.fatal(error);
        }
    }


    private async registerEvents(): Promise<void> {
        try {
            await Globals.loggerInstance.pending("Running registerEvents();");
            fs.readdir(Path.resolve(__dirname, "event", "impl"), async (error, files) => {
                for (const event of files) {
                    const requiredEvent = require(Path.resolve(__dirname, "event", "impl", event)).default;
                    const eventClass = new requiredEvent() as IEvent;
                    Globals.clientInstance.on(eventClass.name, eventClass.override.bind(null, Globals.clientInstance));
                    await Globals.loggerInstance.success(`Event ${event} loaded.`);
                }
                await Globals.loggerInstance.complete("registerEvents(); completed.")
            });
        } catch (error) {
            await Globals.loggerInstance.fatal(error);
        }
    }

    private async detectOrCreateDatabase(): Promise<void> {
        try {
            await Globals.loggerInstance.pending("Detecting or creating database gatekeeper if not detected.");
            await Globals.databaseConnection.query("CREATE DATABASE IF NOT EXISTS gatekeeper", async (error, response) => {
                if (response.affectedRows > 0) {
                    await Globals.loggerInstance.complete("Database gatekeeper was successfully created.");
                } else {
                    await Globals.loggerInstance.complete("Database gatekeeper was successfully detected.");
                }

                await Globals.databaseConnection.query("USE gatekeeper");
                await Globals.loggerInstance.info("Using database gateekeeper.");
                await Globals.loggerInstance.pending("Creating or detecting table guildconfiguration...");

                await Globals.databaseConnection.query("CREATE TABLE IF NOT EXISTS `guildconfiguration` (`guildid` TEXT NULL DEFAULT NULL, `logschannelid` TEXT NULL DEFAULT NULL, `filter` INT(1) NULL DEFAULT NULL)", async (error, response) => {
                    if (response.affectedRows > 0) {
                        await Globals.loggerInstance.complete("Table guildconfiguration was successfully created.")
                    } else {
                        await Globals.loggerInstance.complete("Table guildconfiguration was successfully detected.")
                    }
                });

                await Globals.loggerInstance.pending("Creating or detecting table lastmessage...");

                await Globals.databaseConnection.query("CREATE TABLE IF NOT EXISTS `lastmessages` " +
                    "(`guildname` TEXT NULL DEFAULT NULL, `guildid` TEXT NULL DEFAULT NULL, `channelid` TEXT NULL DEFAULT NULL, `message` TEXT NULL DEFAULT NULL, `authorid` TEXT NULL DEFAULT NULL)", async (error, response) => {
                    if (response.affectedRows > 0) {
                        await Globals.loggerInstance.complete("Table lastmessages was successfully created.")
                    } else {
                        await Globals.loggerInstance.complete("Table lastmessages was successfully detected.")
                    }
                });

                await Globals.databaseConnection.query("CREATE TABLE IF NOT EXISTS `mutedusers` " +
                    "(`guildname` TEXT NULL DEFAULT NULL, `guildid` TEXT NULL DEFAULT NULL, `userid` TEXT NULL DEFAULT NULL, `muteroleid` TEXT NULL DEFAULT NULL, `datefrom` TEXT NULL DEFAULT NULL, `dateto` TEXT NULL DEFAULT NULL)", async (error, response) => {
                    if (response.affectedRows > 0) {
                        await Globals.loggerInstance.complete("Table mutedusers was successfully created.")
                    } else {
                        await Globals.loggerInstance.complete("Table mutedusers was successfully detected.")
                    }
                });
            })
        } catch (error) {
            await Globals.loggerInstance.fatal(error);
        }
    }

    public async start(): Promise<void> {
        await this.detectOrCreateDatabase();

        await this.registerCommands();

        await this.registerEvents();

        process.on("unhandledRejection", error => {
            Globals.loggerInstance.fatal(error);
        });

        await Globals.clientInstance.login(Globals.config.token)
    }
}