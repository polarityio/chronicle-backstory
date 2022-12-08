const _ = require('lodash');
const moment = require('moment');

const { EVENT_INDICATOR_TYPES } = require('./constants');

const { _P, generateTimes } = require('./dataTransformations');

const getEvents = async (entityGroups, options, requestWithDefaults) =>
  _P
    .chain(entityGroups)
    .pick(['ip', 'domain', 'mac'])
    .reduce(
      async (agg, entityGroup, entityType) => ({
        ...agg,
        ...(await _P.reduce(
          entityGroup,
          async (agg, entity) => {
            const { body: eventList } = await requestWithDefaults({
              url: `https://${options.domain}/v1/asset/listevents`,
              options,
              qs: {
                [`asset.${EVENT_INDICATOR_TYPES[entityType]}`]: entity.value,
                page_size: 25,
                ...generateTimes(options, 'Event')
              }
            });

            const valueReturned =
              eventList &&
              ((eventList.uri && eventList.uri.length) ||
                (eventList.events && eventList.events.length));

            return !valueReturned ? agg : _formatEventList(agg, eventList, entity.value);
          },
          {}
        ))
      }),
      {}
    )
    .value();


const _formatEventList = (agg, eventList, entityValue) => {
  const uri = eventList.uri && { eventsLink: eventList.uri[0] };

  const events =
    eventList.events &&
    eventList.events.length &&
    eventList.events
      .map(
        ({ metadata: _metadata, principal: _principal, target: _target, ...event }) => {
          const { eventTimestamp, collectedTimestamp, eventType } = _metadata || {
            eventTimestamp: null,
            collectedTimestamp: null,
            eventType: null
          };

          const { principalIp, ...principal } = _principal || { principalIp: null };
          const { targetIp, ...target } = _target || { targetIp: null };

          return {
            ...event,
            ...(eventType && { eventType }),
            ...(eventTimestamp && {
              eventTimestamp: moment(eventTimestamp).format('MMM DD YYYY, h:mm A')
            }),
            ...(collectedTimestamp && {
              collectedTimestamp: moment(collectedTimestamp).format('MMM DD YYYY, h:mm A')
            }),
            ...(principalIp ||
              (!_.isEmpty(principal) && {
                principal: {
                  ...principal,
                  ...(principalIp && { ip: principalIp.join(', ') })
                }
              })),
            ...(targetIp ||
              (!_.isEmpty(target) && {
                target: {
                  ...target,
                  ...(targetIp && { ip: targetIp.join(', ') })
                }
              }))
          };
        }
      )
      .filter(_.negate(_.isEmpty));

  return {
    ...agg,
    [entityValue]: {
      ...uri,
      // Return empty array if there are no events found.  Note that this allows us to differentiate between
      // not having searched events and not having any events.
      ...(events && events.length ? { events } : { events: [] })
    }
  };
};

module.exports = getEvents;