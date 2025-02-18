export class TaskManager {
  constructor(storage) {
    this.storage = storage;
    this.groups = new Map();
    this.currentGroup = null;
  }

  loadData() {
    const data = this.storage.getData();
    if (data && data.groups) {
      data.groups.forEach(group => {
        const tasksMap = new Map();
        if (Array.isArray(group.tasks)) {
          group.tasks.forEach(task => {
            tasksMap.set(task.id, {
              ...task,
              createdAt: new Date(task.createdAt),
              completedAt: task.completedAt ? new Date(task.completedAt) : null,
              dueDate: task.dueDate ? new Date(task.dueDate) : null
            });
          });
        }
        
        this.groups.set(group.id, {
          id: group.id,
          name: group.name,
          background: group.background, 
          tasks: tasksMap,
          stats: group.stats || {
            complete: 0,
            incomplete: 0
          }
        });
      });
    }
  }

  createGroup(name, background) {
    const group = {
      id: Date.now().toString(),
      name,
      background: background || { type: 'color', value: '#ffffff' }, 
      tasks: new Map(),
      stats: {
        complete: 0,
        incomplete: 0
      }
    };
    this.groups.set(group.id, group);
    this.saveData();
    return group;
  }

  createTask(groupId, title) {
    const task = {
      id: Date.now().toString(),
      title,
      completed: false,
      createdAt: new Date(),
      completedAt: null
    };
    
    const group = this.groups.get(groupId);
    if (group) {
      group.tasks.set(task.id, task);
      group.stats.incomplete++;
      this.updateActivityStats('create');
      this.saveData();
    }
    return task;
  }

  toggleTask(groupId, taskId) {
    const group = this.groups.get(groupId);
    if (group) {
      const task = group.tasks.get(taskId);
      if (task) {
        task.completed = !task.completed;
        task.completedAt = task.completed ? new Date() : null;
        group.stats[task.completed ? 'complete' : 'incomplete']++;
        group.stats[task.completed ? 'incomplete' : 'complete']--;
        this.saveData();
      }
    }
  }

  markAllTasksComplete(groupId) {
    const group = this.groups.get(groupId);
    if (group) {
      group.tasks.forEach(task => {
        if (!task.completed) {
          task.completed = true;
          task.completedAt = new Date();
          group.stats.complete++;
          group.stats.incomplete--;
        }
      });
      this.saveData();
    }
  }

  getGroupStats(groupId) {
    const group = this.groups.get(groupId);
    if (!group) return null;

    const today = new Date();
    const lastWeek = new Array(7).fill(0).map((_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      return date;
    }).reverse();

    const stats = lastWeek.map(date => {
      const tasksUpToDate = Array.from(group.tasks.values()).filter(task => 
        new Date(task.createdAt) <= date
      );

      const completed = Array.from(group.tasks.values()).filter(task => 
        task.completedAt && 
        new Date(task.completedAt).toDateString() === date.toDateString()
      ).length;

      const created = Array.from(group.tasks.values()).filter(task =>
        new Date(task.createdAt).toDateString() === date.toDateString()
      ).length;

      return {
        date: date.toLocaleDateString(),
        completed,
        created,
        total: tasksUpToDate.length
      };
    });

    return stats;
  }

  deleteTask(groupId, taskId) {
    const group = this.groups.get(groupId);
    if (group) {
      const task = group.tasks.get(taskId);
      if (task) {
        if (task.completed) {
          group.stats.complete--;
        } else {
          group.stats.incomplete--;
        }
        group.tasks.delete(taskId);
        this.saveData();
      }
    }
  }

  saveData() {
    const data = {
      groups: Array.from(this.groups.values()).map(group => ({
        id: group.id,
        name: group.name,
        background: group.background, 
        stats: group.stats,
        tasks: Array.from(group.tasks.values()).map(task => ({
          ...task,
          createdAt: task.createdAt.toISOString(),
          completedAt: task.completedAt ? task.completedAt.toISOString() : null,
          dueDate: task.dueDate ? task.dueDate.toISOString() : null
        }))
      }))
    };
    this.storage.saveData(data);
  }

  deleteGroup(groupId) {
    this.groups.delete(groupId);
    this.saveData();
  }

  getAllTaskStats() {
    const today = new Date();
    const lastWeek = new Array(7).fill(0).map((_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      return date;
    }).reverse();

    const stats = lastWeek.map(date => {
      let completed = 0;
      let created = 0;
      let total = 0;

      this.groups.forEach(group => {
        Array.from(group.tasks.values()).forEach(task => {
          if (task.completedAt && 
              task.completedAt.toDateString() === date.toDateString()) {
            completed++;
          }
          if (task.createdAt.toDateString() === date.toDateString()) {
            created++;
          }
          if (task.createdAt <= date) {
            total++;
          }
        });
      });

      return {
        date: date.toLocaleDateString(),
        completed,
        created,
        total
      };
    });

    return stats;
  }

  getTotalStats() {
    const stats = JSON.parse(localStorage.getItem('activityStats')) || {
      hourly: new Array(24).fill(0),
      weekly: new Array(7).fill(0)
    };

    let totalTasks = 0;
    let completedTasks = 0;
    let uncompletedTasks = 0;
    const hourlyActivity = new Array(8).fill(0);

    // Convert 24-hour data to 8 3-hour blocks
    for (let i = 0; i < 24; i++) {
      hourlyActivity[Math.floor(i / 3)] += stats.hourly[i];
    }

    this.groups.forEach(group => {
      group.tasks.forEach(task => {
        totalTasks++;
        if (task.completed) {
          completedTasks++;
        } else {
          uncompletedTasks++;
        }
      });
    });

    let peakHour = stats.hourly.indexOf(Math.max(...stats.hourly));
    const peakTime = `${peakHour % 12 || 12}${peakHour < 12 ? 'am' : 'pm'}`;

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const mostActiveDay = days[stats.weekly.indexOf(Math.max(...stats.weekly))];

    return {
      total: totalTasks,
      completed: completedTasks,
      uncompleted: uncompletedTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      mostActiveDay,
      peakActivityTime: peakTime,
      avgCompletionTime: 'N/A',
      longestStreak: this.calculateStreak(),
      hourlyActivity,
      weekdayActivity: stats.weekly
    };
  }

  calculateStreak() {
    let streak = 0;
    let maxStreak = 0;
    const dates = new Set();

    this.groups.forEach(group => {
      group.tasks.forEach(task => {
        if (task.createdAt) {
          dates.add(new Date(task.createdAt).toDateString());
        }
      });
    });

    const sortedDates = Array.from(dates).sort();
    for (let i = 0; i < sortedDates.length; i++) {
      const current = new Date(sortedDates[i]);
      const prev = i > 0 ? new Date(sortedDates[i - 1]) : null;

      if (prev && (current - prev) / (1000 * 60 * 60 * 24) === 1) {
        streak++;
      } else {
        streak = 1;
      }
      maxStreak = Math.max(maxStreak, streak);
    }

    return maxStreak;
  }

  updateActivityStats(action) {
    // Initialize activity stats if they don't exist
    if (!localStorage.getItem('activityStats')) {
      localStorage.setItem('activityStats', JSON.stringify({
        hourly: new Array(24).fill(0),
        weekly: new Array(7).fill(0),
        lastReset: new Date().toISOString()
      }));
    }

    let stats = JSON.parse(localStorage.getItem('activityStats'));
    const now = new Date();
    
    // Reset stats if it's been more than a week
    if (new Date(stats.lastReset).getTime() + 7 * 24 * 60 * 60 * 1000 < now.getTime()) {
      stats.hourly = new Array(24).fill(0);
      stats.weekly = new Array(7).fill(0);
      stats.lastReset = now.toISOString();
    }

    // Update hourly and weekly stats
    stats.hourly[now.getHours()]++;
    stats.weekly[now.getDay()]++;

    localStorage.setItem('activityStats', JSON.stringify(stats));
  }

  saveNoteContent(groupId, taskId, content) {
    const group = this.groups.get(groupId);
    if (group) {
      const task = group.tasks.get(taskId);
      if (task) {
        task.notes = content;
        this.saveData();
      }
    }
  }

  getNoteContent(groupId, taskId) {
    const group = this.groups.get(groupId);
    if (group) {
      const task = group.tasks.get(taskId);
      if (task) {
        return task.notes || '';
      }
    }
    return '';
  }

  saveTaskNotes(groupId, taskId, notes) {
    const group = this.groups.get(groupId);
    if (group) {
      const task = group.tasks.get(taskId);
      if (task) {
        task.notes = notes;
        this.updateActivityStats('update');
        this.saveData();
      }
    }
  }

  getTaskNotes(groupId, taskId) {
    const group = this.groups.get(groupId);
    if (group) {
      const task = group.tasks.get(taskId);
      if (task) {
        return task.notes || '';
      }
    }
    return '';
  }
}