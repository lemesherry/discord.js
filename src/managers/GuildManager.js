'use strict';

const CachedManager = require('./CachedManager');
const Guild = require('../structures/Guild');
const GuildChannel = require('../structures/GuildChannel');
const GuildEmoji = require('../structures/GuildEmoji');
const GuildMember = require('../structures/GuildMember');
const Invite = require('../structures/Invite');
const OAuth2Guild = require('../structures/OAuth2Guild');
const Role = require('../structures/Role');
const Collection = require('../util/Collection');
const {
  ChannelTypes,
  Events,
  VerificationLevels,
  DefaultMessageNotificationLevels,
  ExplicitContentFilterLevels,
} = require('../util/Constants');
const DataResolver = require('../util/DataResolver');
const Permissions = require('../util/Permissions');
const SystemChannelFlags = require('../util/SystemChannelFlags');
const { resolveColor } = require('../util/Util');

/**
 * Manages API methods for Guilds and stores their cache.
 * @extends {CachedManager}
 */
class GuildManager extends CachedManager {
  constructor(client, iterable) {
    super(client, Guild, iterable);
  }

  /**
   * The cache of this Manager
   * @type {Collection<Snowflake, Guild>}
   * @name GuildManager#cache
   */

  /**
   * Data that resolves to give a Guild object. This can be:
   * * A Guild object
   * * A GuildChannel object
   * * A GuildEmoji object
   * * A Role object
   * * A Snowflake
   * * An Invite object
   * @typedef {Guild|GuildChannel|GuildMember|GuildEmoji|Role|Snowflake|Invite} GuildResolvable
   */

  /**
   * Partial data for a Role.
   * @typedef {Object} PartialRoleData
   * @property {Snowflake|number} [id] The role's id, used to set channel overrides,
   * this is a placeholder and will be replaced by the API after consumption
   * @property {string} [name] The name of the role
   * @property {ColorResolvable} [color] The color of the role, either a hex string or a base 10 number
   * @property {boolean} [hoist] Whether or not the role should be hoisted
   * @property {number} [position] The position of the role
   * @property {PermissionResolvable} [permissions] The permissions of the role
   * @property {boolean} [mentionable] Whether or not the role should be mentionable
   */

  /**
   * Partial overwrite data.
   * @typedef {Object} PartialOverwriteData
   * @property {Snowflake|number} id The {@link Role} or {@link User} id for this overwrite
   * @property {string} [type] The type of this overwrite
   * @property {PermissionResolvable} [allow] The permissions to allow
   * @property {PermissionResolvable} [deny] The permissions to deny
   */

  /**
   * Partial data for a Channel.
   * @typedef {Object} PartialChannelData
   * @property {Snowflake|number} [id] The channel's id, used to set its parent,
   * this is a placeholder and will be replaced by the API after consumption
   * @property {Snowflake|number} [parentId] The parent id for this channel
   * @property {ChannelType} [type] The type of the channel
   * @property {string} name The name of the channel
   * @property {string} [topic] The topic of the text channel
   * @property {boolean} [nsfw] Whether the channel is NSFW
   * @property {number} [bitrate] The bitrate of the voice channel
   * @property {number} [userLimit] The user limit of the channel
   * @property {PartialOverwriteData[]} [permissionOverwrites]
   * Overwrites of the channel
   * @property {number} [rateLimitPerUser] The rate limit per user of the channel in seconds
   */

  /**
   * Resolves a GuildResolvable to a Guild object.
   * @method resolve
   * @memberof GuildManager
   * @instance
   * @param {GuildResolvable} guild The guild resolvable to identify
   * @returns {?Guild}
   */
  resolve(guild) {
    if (
      guild instanceof GuildChannel ||
      guild instanceof GuildMember ||
      guild instanceof GuildEmoji ||
      guild instanceof Role ||
      (guild instanceof Invite && guild.guild)
    ) {
      return super.resolve(guild.guild);
    }
    return super.resolve(guild);
  }

  /**
   * Resolves a {@link GuildResolvable} to a {@link Guild} id string.
   * @method resolveId
   * @memberof GuildManager
   * @instance
   * @param {GuildResolvable} guild The guild resolvable to identify
   * @returns {?Snowflake}
   */
  resolveId(guild) {
    if (
      guild instanceof GuildChannel ||
      guild instanceof GuildMember ||
      guild instanceof GuildEmoji ||
      guild instanceof Role ||
      (guild instanceof Invite && guild.guild)
    ) {
      return super.resolveId(guild.guild.id);
    }
    return super.resolveId(guild);
  }

  /**
   * Options used to create a guild.
   * @typedef {Object} GuildCreateOptions
   * @property {Snowflake|number} [afkChannelId] The AFK channel's id
   * @property {number} [afkTimeout] The AFK timeout in seconds
   * @property {PartialChannelData[]} [channels=[]] The channels for this guild
   * @property {DefaultMessageNotificationLevel|number} [defaultMessageNotifications] The default message notifications
   * for the guild
   * @property {ExplicitContentFilterLevel} [explicitContentFilter] The explicit content filter level for the guild
   * @property {BufferResolvable|Base64Resolvable} [icon=null] The icon for the guild
   * @property {PartialRoleData[]} [roles=[]] The roles for this guild,
   * the first element of this array is used to change properties of the guild's everyone role.
   * @property {Snowflake|number} [systemChannelId] The system channel's id
   * @property {SystemChannelFlagsResolvable} [systemChannelFlags] The flags of the system channel
   * @property {VerificationLevel} [verificationLevel] The verification level for the guild
   */

  /**
   * Creates a guild.
   * <warn>This is only available to bots in fewer than 10 guilds.</warn>
   * @param {string} name The name of the guild
   * @param {GuildCreateOptions} [options] Options for creating the guild
   * @returns {Promise<Guild>} The guild that was created
   */
  async create(
    name,
    {
      afkChannelId,
      afkTimeout,
      channels = [],
      defaultMessageNotifications,
      explicitContentFilter,
      icon = null,
      roles = [],
      systemChannelId,
      systemChannelFlags,
      verificationLevel,
    } = {},
  ) {
    icon = await DataResolver.resolveImage(icon);
    if (typeof verificationLevel === 'string') {
      verificationLevel = VerificationLevels[verificationLevel];
    }
    if (typeof defaultMessageNotifications === 'string') {
      defaultMessageNotifications = DefaultMessageNotificationLevels[defaultMessageNotifications];
    }
    if (typeof explicitContentFilter === 'string') {
      explicitContentFilter = ExplicitContentFilterLevels[explicitContentFilter];
    }
    for (const channel of channels) {
      if (channel.type) channel.type = ChannelTypes[channel.type.toUpperCase()];
      channel.parent_id = channel.parentId;
      delete channel.parentId;
      if (!channel.permissionOverwrites) continue;
      for (const overwrite of channel.permissionOverwrites) {
        if (overwrite.allow) overwrite.allow = Permissions.resolve(overwrite.allow).toString();
        if (overwrite.deny) overwrite.deny = Permissions.resolve(overwrite.deny).toString();
      }
      channel.permission_overwrites = channel.permissionOverwrites;
      delete channel.permissionOverwrites;
    }
    for (const role of roles) {
      if (role.color) role.color = resolveColor(role.color);
      if (role.permissions) role.permissions = Permissions.resolve(role.permissions).toString();
    }
    if (systemChannelFlags) systemChannelFlags = SystemChannelFlags.resolve(systemChannelFlags);

    return new Promise((resolve, reject) =>
      this.client.api.guilds
        .post({
          data: {
            name,
            icon,
            verification_level: verificationLevel,
            default_message_notifications: defaultMessageNotifications,
            explicit_content_filter: explicitContentFilter,
            roles,
            channels,
            afk_channel_id: afkChannelId,
            afk_timeout: afkTimeout,
            system_channel_id: systemChannelId,
            system_channel_flags: systemChannelFlags,
          },
        })
        .then(data => {
          if (this.client.guilds.cache.has(data.id)) return resolve(this.client.guilds.cache.get(data.id));

          const handleGuild = guild => {
            if (guild.id === data.id) {
              clearTimeout(timeout);
              this.client.removeListener(Events.GUILD_CREATE, handleGuild);
              this.client.decrementMaxListeners();
              resolve(guild);
            }
          };
          this.client.incrementMaxListeners();
          this.client.on(Events.GUILD_CREATE, handleGuild);

          const timeout = setTimeout(() => {
            this.client.removeListener(Events.GUILD_CREATE, handleGuild);
            this.client.decrementMaxListeners();
            resolve(this.client.guilds._add(data));
          }, 10000).unref();
          return undefined;
        }, reject),
    );
  }

  /**
   * Options used to fetch a single guild.
   * @typedef {BaseFetchOptions} FetchGuildOptions
   * @property {GuildResolvable} guild The guild to fetch
   */

  /**
   * Options used to fetch multiple guilds.
   * @typedef {Object} FetchGuildsOptions
   * @property {Snowflake} [before] Get guilds before this guild id
   * @property {Snowflake} [after] Get guilds after this guild id
   * @property {number} [limit=100] Maximum number of guilds to request (1-100)
   */

  /**
   * Obtains one or multiple guilds from Discord, or the guild cache if it's already available.
   * @param {GuildResolvable|FetchGuildOptions|FetchGuildsOptions} [options] The guild's id or options
   * @returns {Promise<Guild|Collection<Snowflake, OAuth2Guild>>}
   */
  async fetch(options = {}) {
    const id = this.resolveId(options) ?? this.resolveId(options.guild);

    if (id) {
      if (!options.force) {
        const existing = this.cache.get(id);
        if (existing) return existing;
      }

      const data = await this.client.api.guilds(id).get({ query: { with_counts: true } });
      return this._add(data, options.cache);
    }

    const data = await this.client.api.users('@me').guilds.get({ query: options });
    return data.reduce((coll, guild) => coll.set(guild.id, new OAuth2Guild(this.client, guild)), new Collection());
  }
}

module.exports = GuildManager;
