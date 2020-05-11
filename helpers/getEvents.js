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
              url: 'https://backstory.googleapis.com/v1/asset/listevents',
              options,
              qs: {
                [`asset.${EVENT_INDICATOR_TYPES[entityType]}`]: entity.value,
                page_size: 50,
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
  
  const events = eventList.events &&
    eventList.events.length && {
      events: eventList.events.map(
        ({
          metadata: { eventTimestamp, collectedTimestamp, eventType },
          principal: { principalIp, ...principal },
          target: { targetIp, ...target },
          ...event
        }) => ({
          ...event,
          eventType,
          eventTimestamp: moment(eventTimestamp).format('MMM DD YYYY, h:mm A'),
          collectedTimestamp: moment(collectedTimestamp).format('MMM DD YYYY, h:mm A'),
          principal: {
            ...principal,
            ip: principalIp.join(', ')
          },
          target: {
            ...target,
            ip: targetIp.join(', ')
          }
        })
      )
    };

  return {
    ...agg,
    [entityValue]: {
      ...uri,
      ...events
    }
  };
};

module.exports = getEvents;