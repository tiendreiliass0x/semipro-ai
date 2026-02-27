export const validateStorylinesPayload = (storylines: any): string[] => {
  const errors: string[] = [];
  if (!Array.isArray(storylines)) {
    errors.push('storylines must be an array');
    return errors;
  }

  const isString = (value: any) => typeof value === 'string';
  const isNumber = (value: any) => typeof value === 'number' && Number.isFinite(value);
  const pushError = (path: string, message: string) => {
    if (errors.length < 40) errors.push(`${path}: ${message}`);
  };

  storylines.forEach((line: any, lineIndex: number) => {
    const linePath = `storylines[${lineIndex}]`;
    if (!line || typeof line !== 'object') {
      pushError(linePath, 'must be an object');
      return;
    }

    const requiredStringFields = ['id', 'title', 'description', 'style', 'tone', 'openingLine', 'closingLine'];
    requiredStringFields.forEach(field => {
      if (!isString(line[field])) pushError(`${linePath}.${field}`, 'must be a string');
    });

    if (!Array.isArray(line.tags)) pushError(`${linePath}.tags`, 'must be an array');
    if (!Array.isArray(line.beats)) pushError(`${linePath}.beats`, 'must be an array');

    if (!line.timeframe || typeof line.timeframe !== 'object') {
      pushError(`${linePath}.timeframe`, 'must be an object');
    } else {
      if (!isString(line.timeframe.start)) pushError(`${linePath}.timeframe.start`, 'must be a string');
      if (!isString(line.timeframe.end)) pushError(`${linePath}.timeframe.end`, 'must be a string');
      if (!Array.isArray(line.timeframe.years)) {
        pushError(`${linePath}.timeframe.years`, 'must be an array');
      } else {
        line.timeframe.years.forEach((year: any, yearIndex: number) => {
          if (!isNumber(year)) pushError(`${linePath}.timeframe.years[${yearIndex}]`, 'must be a number');
        });
      }
    }

    if (!Array.isArray(line.beats)) return;

    line.beats.forEach((beat: any, beatIndex: number) => {
      const beatPath = `${linePath}.beats[${beatIndex}]`;
      if (!beat || typeof beat !== 'object') {
        pushError(beatPath, 'must be an object');
        return;
      }

      ['id', 'summary', 'voiceover'].forEach(field => {
        if (!isString(beat[field])) pushError(`${beatPath}.${field}`, 'must be a string');
      });
      if (!isNumber(beat.intensity)) pushError(`${beatPath}.intensity`, 'must be a number');

      const source = beat.anecdote ?? beat.source;
      if (source != null) {
        if (!source || typeof source !== 'object') {
          pushError(`${beatPath}.anecdote`, 'must be an object when provided');
        } else if (source.id != null && !isString(source.id)) {
          pushError(`${beatPath}.anecdote.id`, 'must be a string when provided');
        }
      }

      if (beat.connection != null) {
        if (!beat.connection || typeof beat.connection !== 'object') {
          pushError(`${beatPath}.connection`, 'must be an object or null');
        } else {
          if (!isString(beat.connection.type)) pushError(`${beatPath}.connection.type`, 'must be a string');
          if (!isString(beat.connection.label)) pushError(`${beatPath}.connection.label`, 'must be a string');
        }
      }
    });
  });

  return errors;
};
