/**
 * ISchedulerEngine
 *
 * Interface contract for all scheduling engine implementations.
 * Any class that extends this must implement the `schedule` method.
 */
class ISchedulerEngine {
  /**
   * Runs the bin-packing algorithm.
   *
   * @param {Array<Object>} tasks      - AI-enriched task metadata array from the DB.
   * @param {Array<Object>} calendars  - One or more user calendar arrays with busy blocks.
   * @param {Object}        userPrefs  - User scheduling preferences (work hours, timezone, etc.)
   * @returns {Array<Object>}          - Tasks with schedule_blocks assigned.
   */
  schedule(tasks, calendars, userPrefs) {
    throw new Error("Method 'schedule()' must be implemented.");
  }
}

export default ISchedulerEngine;
