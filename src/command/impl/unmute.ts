import * as Discord from "discord.js"

import {ICommand} from "../command";
import {Checks} from "../../utils/checks";
import {Globals} from "../../globals";
import {getRepository} from "typeorm";
import {GuildConfiguration} from "../../entity/guildConfiguration";
import {Announcements} from "../../utils/announcements";

export default class UnmuteCommand implements ICommand {

    constructor() {
        this.description = "Unmutes an user.";
        this.syntax = "unmute";
        this.args = "[memberToUnmute: mention]";
    }

    description: string;
    syntax: string;
    args: string;

    async action(clientInstance: Discord.Client, message: Discord.Message, args: string[]): Promise<void> {
        try {
            if (!Checks.permissionCheck(message, "MANAGE_MESSAGES")) return;

            if (!Checks.argsCheck(message, this, args)) return;

            const memberToUnmute = await message.mentions.members.first();
            const muteRole: Discord.Role = await message.guild.roles.find(role => role.name == "Muted");

            await memberToUnmute.removeRole(muteRole);

            const guildConfigurationsRepository = getRepository(GuildConfiguration);

            guildConfigurationsRepository.find({where: {guildID: message.guild.id}}).then(configuration => {
                for (const guildConfiguration of configuration) {
                    if ((guildConfiguration.guildID == message.guild.id) && guildConfiguration.logsChannelID != "none") {

                        const embed = new Discord.RichEmbed()
                            .setColor(0x161616)
                            .setAuthor(memberToUnmute.user.tag, memberToUnmute.user.avatarURL)
                            .setTitle(`Member unmute detected.`)
                            .addField("Invoker:", `<@${message.author.id}>`)
                            .setFooter("🔑 Gatekeeper moderation")
                            .setTimestamp(new Date());

                        // @ts-ignore
                        clientInstance.channels.get(guildConfiguration.logsChannelID).send(embed);
                    }
                }
            }).then(() => {
                Announcements.success(message, `Successfully unmuted`, `<@${memberToUnmute.user.id}>.`);
            });
        } catch (error) {
            await Globals.loggerInstance.fatal(error);
        }
    }
}